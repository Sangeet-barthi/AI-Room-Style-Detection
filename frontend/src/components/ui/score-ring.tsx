import { motion, useReducedMotion } from 'motion/react'

import { cn, scoreTone } from '@/lib/utils'

interface ScoreRingProps {
  score: number
  label?: string
  size?: number
  strokeWidth?: number
  className?: string
  caption?: string
}

const TONE_CLASS = {
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
} as const

export function ScoreRing({
  score,
  label,
  size = 160,
  strokeWidth = 10,
  className,
  caption = 'out of 100',
}: ScoreRingProps) {
  const reduced = useReducedMotion()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label ?? 'Score'}: ${clamped} out of 100`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-elevated"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className={TONE_CLASS[scoreTone(clamped)]}
          initial={{ strokeDashoffset: reduced ? offset : circumference }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-medium tabular-nums text-ink">{clamped}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-subtle">{caption}</span>
        {label && <span className="mt-1 text-xs font-medium text-muted">{label}</span>}
      </div>
    </div>
  )
}
