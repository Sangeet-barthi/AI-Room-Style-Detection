import { Monitor, Moon, Sun } from 'lucide-react'
import { motion } from 'motion/react'

import { useTheme, type ThemeMode } from '@/stores/theme'
import { cn } from '@/lib/utils'

const OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light theme' },
  { value: 'dark', icon: Moon, label: 'Dark theme' },
  { value: 'system', icon: Monitor, label: 'Match system theme' },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn('inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-1', className)}
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setMode(value)}
            className="relative flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:text-ink"
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-pill"
                className="absolute inset-0 rounded-full bg-elevated"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <Icon className={cn('relative size-4', active && 'text-ink')} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
