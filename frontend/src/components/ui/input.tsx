import * as React from 'react'

import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-line bg-surface px-3.5 text-sm text-ink transition-colors duration-fast',
        'placeholder:text-subtle hover:border-ink/25',
        'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/25',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-24 w-full rounded-md border border-line bg-surface p-3.5 text-sm text-ink',
      'placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
