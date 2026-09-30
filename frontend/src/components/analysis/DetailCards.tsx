import { Layers, Sofa } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { FurnitureItem, MaterialItem } from '@/types/api'

export function FurnitureCard({ item }: { item: FurnitureItem }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-accent/10">
          <Sofa className="size-4 text-accent" aria-hidden="true" />
        </span>
        <Badge variant={item.evidence_type === 'observed' ? 'success' : 'outline'}>
          {item.evidence_type}
        </Badge>
      </div>
      <h4 className="mt-4 text-[15px] font-medium text-ink">{item.name}</h4>
      {item.description && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{item.description}</p>
      )}
      {item.condition_note && (
        <p className="mt-2 text-[12px] italic text-subtle">{item.condition_note}</p>
      )}
    </Card>
  )
}

export function MaterialCard({ item }: { item: MaterialItem }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-accent/10">
          <Layers className="size-4 text-accent" aria-hidden="true" />
        </span>
        <Badge variant={item.evidence_type === 'observed' ? 'success' : 'outline'}>
          {item.evidence_type}
        </Badge>
      </div>
      <h4 className="mt-4 text-[15px] font-medium text-ink">{item.name}</h4>
      {item.where_seen && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">Seen on {item.where_seen}</p>
      )}
    </Card>
  )
}
