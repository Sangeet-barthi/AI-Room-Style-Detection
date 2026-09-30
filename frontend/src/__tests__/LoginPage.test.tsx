import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LoginPage from '@/pages/LoginPage'
import { renderWithProviders } from '@/test/utils'

const loginMock = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    login: (...args: unknown[]) => loginMock(...args),
    me: vi.fn().mockRejectedValue(new Error('anonymous')),
    logout: vi.fn(),
    register: vi.fn(),
  },
}))

vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ data: { demo_mode: false } }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    loginMock.mockReset()
  })

  it('renders accessible email and password fields', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('validates the email format before calling the API', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/does not look like an email/i)).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('requires a password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/enter your password/i)).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    const field = screen.getByLabelText(/^password$/i)
    expect(field).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: /show password/i }))
    expect(field).toHaveAttribute('type', 'text')
  })

  it('submits valid credentials to the API', async () => {
    const user = userEvent.setup()
    loginMock.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      token_type: 'bearer',
      expires_in: 1800,
      user: {
        id: '1',
        email: 'user@example.com',
        full_name: 'Test User',
        is_demo: false,
        created_at: new Date().toISOString(),
      },
    })

    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'StrongPass123',
      }),
    )
  })
})
