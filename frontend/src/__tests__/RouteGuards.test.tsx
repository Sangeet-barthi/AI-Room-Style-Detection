import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'

import { ProtectedRoute, PublicOnlyRoute } from '@/layouts/RouteGuards'
import { renderWithProviders } from '@/test/utils'

const meMock = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    me: () => meMock(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  },
}))

const tree = (
  <Routes>
    <Route path="/login" element={<p>Login screen</p>} />
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<p>Dashboard screen</p>} />
    </Route>
    <Route element={<PublicOnlyRoute />}>
      <Route path="/public-login" element={<p>Public login</p>} />
    </Route>
  </Routes>
)

describe('route guards', () => {
  beforeEach(() => {
    localStorage.clear()
    meMock.mockReset()
  })

  it('redirects anonymous visitors away from protected routes', async () => {
    renderWithProviders(tree, { route: '/dashboard' })
    expect(await screen.findByText('Login screen')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard screen')).not.toBeInTheDocument()
  })

  it('renders protected content for an authenticated user', async () => {
    localStorage.setItem('roomstyle.access', 'token')
    localStorage.setItem('roomstyle.refresh', 'refresh')
    meMock.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      full_name: 'Test User',
      is_demo: false,
      created_at: new Date().toISOString(),
    })

    renderWithProviders(tree, { route: '/dashboard' })
    await waitFor(() => expect(screen.getByText('Dashboard screen')).toBeInTheDocument())
  })

  it('lets anonymous visitors reach public-only routes', async () => {
    renderWithProviders(tree, { route: '/public-login' })
    expect(await screen.findByText('Public login')).toBeInTheDocument()
  })
})
