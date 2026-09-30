import { motion } from 'motion/react'

import type { DominantColor } from '@/types/api'

export function ColorPalette({ colors }: { colors: DominantColor[] }) {
  if (colors.length === 0) {
    return (
      <p className="text-sm text-muted">
        The palette could not be sampled reliably from this photograph.
      </p>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {colors.map((color, index) => (
        <motion.li
          key={`${color.hex}-${index}`}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-md border border-line bg-surface"
        >
          <span
            className="block h-20 w-full"
            style={{ backgroundColor: color.hex }}
            aria-hidden="true"
          />
          <span className="block p-3">
            <span className="block text-[13px] font-medium text-ink">{color.name}</span>
            <span className="mt-0.5 flex items-center justify-between text-[11px] text-subtle">
              <span className="font-mono uppercase">{color.hex}</span>
              <span className="capitalize">{color.coverage}</span>
            </span>
          </span>
        </motion.li>
      ))}
    </ul>
  )
}
