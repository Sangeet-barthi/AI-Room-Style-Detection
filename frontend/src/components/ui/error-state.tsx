import { AlertTriangle, RefreshCw } from 'lucide-react'

import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  className?: string
  title?: string
}

/** Translates any thrown value into a calm, user-facing message. Never shows stack traces. */
export function ErrorState({ error, onRetry, className, title }: ErrorStateProps) {
  const apiError = error instanceof ApiError ? error : null
  const heading =
    title ??
    (apiError?.isQuotaError
      ? 'AI quota reached'
      : apiError?.isAiError
        ? 'AI service unavailable'
        : 'Something went wrong')

  const message =
    apiError?.message ??
    'We could not complete that request. Please try again in a moment.'

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-danger/20 bg-danger/5 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger/10">
        <AlertTriangle className="size-5 text-danger" aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg font-medium text-ink">{heading}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}
