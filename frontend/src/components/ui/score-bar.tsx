import { motion, useReducedMotion } from 'motion/react'

import { cn, scoreTone } from '@/lib/utils'

interface ScoreBarProps {
  label: string
  score: number
  description?: string
  className?: string
}

const TONE_CLASS = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
} as const

export function ScoreBar({ label, score, description, className }: ScoreBarProps) {
  const reduced = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, score))

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="font-display text-sm tabular-nums text-muted">
          <span className="text-ink">{clamped}</span>/100
        </span>
      </div>
      <div
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} score`}
        className="h-2 w-full overflow-hidden rounded-full bg-elevated"
      >
        <motion.div
          className={cn('h-full rounded-full', TONE_CLASS[scoreTone(clamped)])}
          initial={{ width: reduced ? `${clamped}%` : 0 }}
          whileInView={{ width: `${clamped}%` }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {description && <p className="mt-2 text-[13px] leading-relaxed text-muted">{description}</p>}
    </div>
  )
}
