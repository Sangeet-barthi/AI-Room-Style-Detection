import { Download, MoveHorizontal, Sparkles } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Makeover } from '@/types/api'

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string | null
  makeover: Makeover
  onDownload?: () => void
}

/** Draggable, keyboard-accessible comparison slider. */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  makeover,
  onDownload,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const [dragging, setDragging] = useState(false)

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, next)))
  }, [])

  if (!afterSrc) return null

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full cursor-ew-resize select-none overflow-hidden"
        onPointerDown={(event) => {
          setDragging(true)
          event.currentTarget.setPointerCapture(event.pointerId)
          updateFromClientX(event.clientX)
        }}
        onPointerMove={(event) => dragging && updateFromClientX(event.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <img
          src={afterSrc}
          alt={`${makeover.label} of the room restyled as ${makeover.target_style}`}
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={beforeSrc}
            alt="Your original room photograph"
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
        </div>

        <span className="pointer-events-none absolute left-4 top-4">
          <Badge variant="ink">Before</Badge>
        </span>
        <span className="pointer-events-none absolute right-4 top-4">
          <Badge variant="accent">
            <Sparkles className="size-3" aria-hidden="true" />
            {makeover.label}
          </Badge>
        </span>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-canvas shadow-lift"
          style={{ left: `${position}%` }}
        >
          <span
            className={cn(
              'absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-canvas text-ink shadow-lift transition-transform',
              dragging && 'scale-110',
            )}
          >
            <MoveHorizontal className="size-4" aria-hidden="true" />
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(position)}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label="Reveal the after image. Use the arrow keys to compare."
          className="absolute inset-x-0 bottom-3 mx-auto w-[85%] cursor-ew-resize appearance-none bg-transparent opacity-0 focus-visible:opacity-100"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
        <div>
          <p className="text-[13px] font-medium text-ink">
            {makeover.target_style} · {makeover.label}
          </p>
          <p className="mt-0.5 text-[12px] text-subtle">
            An illustrative concept, not a photograph of the finished room.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPosition(0)}>
            After
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPosition(100)}>
            Before
          </Button>
          {onDownload && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download aria-hidden="true" />
              Download
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
