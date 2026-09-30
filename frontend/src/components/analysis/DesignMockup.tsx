import { Armchair, Layers, Lightbulb, Palette } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Makeover } from '@/types/api'

const GROUPS = [
  { key: 'furniture_changes', title: 'Furniture', icon: Armchair },
  { key: 'lighting_changes', title: 'Lighting', icon: Lightbulb },
  { key: 'material_changes', title: 'Materials', icon: Layers },
  { key: 'decor_changes', title: 'Decor', icon: Palette },
] as const

/**
 * The deterministic fallback shown whenever AI image generation is disabled
 * or unavailable. It is a genuine deliverable, not a placeholder.
 */
export function DesignMockup({ makeover }: { makeover: Makeover }) {
  const palette = makeover.mockup.palette ?? []

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Target direction</p>
          <p className="mt-1 font-display text-xl text-ink">{makeover.target_style}</p>
        </div>
        <Badge variant="outline">Design Mockup</Badge>
      </div>

      {palette.length > 0 && (
        <div className="border-b border-line p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Palette</p>
          <ul className="mt-3 flex gap-2">
            {palette.map((color) => (
              <li key={color.hex} className="flex-1">
                <span
                  className="block h-14 w-full rounded-md border border-line"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                />
                <span className="mt-2 block text-[11px] font-medium text-ink">{color.name}</span>
                <span className="block font-mono text-[10px] uppercase text-subtle">
                  {color.hex}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-px bg-line sm:grid-cols-2">
        {GROUPS.map(({ key, title, icon: Icon }) => {
          const items = makeover.mockup[key] ?? []
          if (items.length === 0) return null
          return (
            <div key={key} className="bg-surface p-5">
              <div className="flex items-center gap-2.5">
                <Icon className="size-4 text-accent" aria-hidden="true" />
                <h4 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                  {title}
                </h4>
              </div>
              <ul className="mt-3 space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink">
                    <span
                      className="mt-[7px] size-1 shrink-0 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {makeover.note && (
        <p className="border-t border-line p-5 text-[12px] leading-relaxed text-subtle">
          {makeover.note}
        </p>
      )}
    </Card>
  )
}
