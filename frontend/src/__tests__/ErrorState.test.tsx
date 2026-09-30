import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/client'
import { ErrorState } from '@/components/ui/error-state'
import { renderWithProviders } from '@/test/utils'

describe('ErrorState', () => {
  it('surfaces a friendly quota message', () => {
    renderWithProviders(
      <ErrorState
        error={new ApiError('The AI free-tier quota has been reached.', 'ai_quota_exceeded', 503)}
      />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/AI quota reached/i)).toBeInTheDocument()
    expect(screen.getByText(/free-tier quota has been reached/i)).toBeInTheDocument()
  })

  it('never renders a raw stack trace for unknown errors', () => {
    const raw = new Error('TypeError: cannot read property x of undefined at line 42')
    renderWithProviders(<ErrorState error={raw} />)
    expect(screen.queryByText(/at line 42/)).not.toBeInTheDocument()
    expect(screen.getByText(/could not complete that request/i)).toBeInTheDocument()
  })

  it('calls the retry handler', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<ErrorState error={new Error('boom')} onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
