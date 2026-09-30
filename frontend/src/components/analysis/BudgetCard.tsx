import { IndianRupee } from 'lucide-react'
import { motion } from 'motion/react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { inr } from '@/lib/utils'
import type { BudgetPlan, Priority } from '@/types/api'

const PRIORITY_VARIANT: Record<Priority, 'danger' | 'warning' | 'default'> = {
  high: 'danger',
  medium: 'warning',
  low: 'default',
}

export function BudgetCard({ plan }: { plan: BudgetPlan }) {
  const usedPercent = plan.budget > 0 ? Math.round((plan.total_estimated_cost / plan.budget) * 100) : 0

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-line bg-elevated/50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Package budget</p>
            <p className="mt-1.5 font-display text-3xl font-medium text-ink">{inr(plan.budget)}</p>
          </div>
          <dl className="flex gap-8 text-right">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-subtle">Estimated</dt>
              <dd className="mt-1 text-[15px] font-medium text-ink">
                {inr(plan.total_estimated_cost)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-subtle">Remaining</dt>
              <dd className="mt-1 text-[15px] font-medium text-success">{inr(plan.remaining)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5">
          <div
            role="meter"
            aria-valuenow={usedPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${usedPercent}% of the ${inr(plan.budget)} budget allocated`}
            className="h-2 w-full overflow-hidden rounded-full bg-elevated"
          >
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.min(usedPercent, 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="mt-2 text-[12px] text-subtle">{usedPercent}% of the budget allocated</p>
        </div>
      </div>

      <ul className="divide-y divide-line">
        {plan.items.map((item) => (
          <li key={item.name} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:gap-5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-accent/10">
              <IndianRupee className="size-3.5 text-accent" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h4 className="text-[15px] font-medium text-ink">{item.name}</h4>
                <Badge variant={PRIORITY_VARIANT[item.priority]}>{item.priority}</Badge>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{item.reason}</p>
              {item.expected_impact && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-subtle">
                  {item.expected_impact}
                </p>
              )}
            </div>
            <span className="shrink-0 font-display text-[15px] text-ink sm:text-right">
              {inr(item.estimated_cost)}
            </span>
          </li>
        ))}
      </ul>

      <p className="border-t border-line p-5 text-[12px] leading-relaxed text-subtle">
        {plan.notes || 'All costs are estimates at typical Indian retail prices.'} Confirm with local
        suppliers before purchase.
      </p>
    </Card>
  )
}
