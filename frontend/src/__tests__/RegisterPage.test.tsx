import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RegisterPage from '@/pages/RegisterPage'
import { renderWithProviders } from '@/test/utils'

const registerMock = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    register: (...args: unknown[]) => registerMock(...args),
    me: vi.fn().mockRejectedValue(new Error('anonymous')),
    login: vi.fn(),
    logout: vi.fn(),
  },
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear()
    registerMock.mockReset()
  })

  it('shows every password requirement', () => {
    renderWithProviders(<RegisterPage />)
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument()
    expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument()
    expect(screen.getByText(/one number/i)).toBeInTheDocument()
  })

  it('updates the strength meter as requirements are met', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText(/^password$/i), 'abc')
    expect(await screen.findByText(/too weak|weak/i)).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/^password$/i))
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123')
    expect(await screen.findByText(/strong/i)).toBeInTheDocument()
  })

  it('blocks mismatched passwords', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Test User')
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123')
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('rejects a weak password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'Test User')
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'alllowercase')
    await user.type(screen.getByLabelText(/confirm password/i), 'alllowercase')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/uppercase letter/i)).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })
})
