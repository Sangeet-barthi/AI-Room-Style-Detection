import { Armchair, Brush, Layers, Lightbulb, Palette, Zap } from 'lucide-react'
import { motion } from 'motion/react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { inr } from '@/lib/utils'
import type { Improvement, ImprovementCategory, Priority } from '@/types/api'

const CATEGORY_META: Record<ImprovementCategory, { icon: typeof Zap; label: string }> = {
  quick: { icon: Zap, label: 'Quick win' },
  lighting: { icon: Lightbulb, label: 'Lighting' },
  furniture: { icon: Armchair, label: 'Furniture' },
  color: { icon: Palette, label: 'Colour' },
  material: { icon: Layers, label: 'Material' },
  decor: { icon: Brush, label: 'Decor' },
}

const PRIORITY_VARIANT: Record<Priority, 'danger' | 'warning' | 'default'> = {
  high: 'danger',
  medium: 'warning',
  low: 'default',
}

export function RecommendationCard({ item, index = 0 }: { item: Improvement; index?: number }) {
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.quick
  const Icon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="flex h-full flex-col p-6 transition-shadow duration-base hover:shadow-card">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-accent/10">
            <Icon className="size-4 text-accent" aria-hidden="true" />
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={PRIORITY_VARIANT[item.priority]}>{item.priority} priority</Badge>
          </div>
        </div>

        <h3 className="mt-4 text-[16px] font-medium leading-snug text-ink">{item.title}</h3>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{item.reason}</p>

        <div className="mt-auto space-y-3 pt-5">
          <p className="border-t border-line pt-4 text-[13px] leading-relaxed text-ink">
            <span className="text-subtle">Expected impact — </span>
            {item.expected_impact}
          </p>
          {item.estimated_cost_inr !== null && (
            <p className="text-[13px] text-muted">
              Estimated cost{' '}
              <span className="font-medium text-ink">{inr(item.estimated_cost_inr)}</span>
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
