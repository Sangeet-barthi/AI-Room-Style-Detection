import { Check, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'

export type AnalysisStage =
  | 'uploading'
  | 'reading'
  | 'style'
  | 'detection'
  | 'health'
  | 'recommendations'
  | 'done'

export const STAGE_ORDER: AnalysisStage[] = [
  'uploading',
  'reading',
  'style',
  'detection',
  'health',
  'recommendations',
  'done',
]

const STAGE_LABELS: Record<AnalysisStage, { title: string; detail: string }> = {
  uploading: { title: 'Uploading your photo', detail: 'Compressed and sent over a secure request.' },
  reading: { title: 'Reading the room', detail: 'Validating and normalising the image server-side.' },
  style: { title: 'Identifying design style', detail: 'Matching visual evidence against seven style rubrics.' },
  detection: { title: 'Detecting furniture and materials', detail: 'Cataloguing what is genuinely visible.' },
  health: { title: 'Evaluating room health', detail: 'Running the deterministic scoring formula.' },
  recommendations: { title: 'Creating recommendations', detail: 'Building the improvement plan and budget packages.' },
  done: { title: 'Finishing up', detail: 'Saving your analysis.' },
}

interface AnalysisTimelineProps {
  stage: AnalysisStage
  uploadPercent: number
}

export function AnalysisTimeline({ stage, uploadPercent }: AnalysisTimelineProps) {
  const currentIndex = STAGE_ORDER.indexOf(stage)

  return (
    <div className="rounded-lg border border-line bg-surface p-7" aria-live="polite">
      <p className="kicker">Analysing</p>
      <h2 className="mt-3 font-display text-2xl text-ink">{STAGE_LABELS[stage].title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{STAGE_LABELS[stage].detail}</p>

      <ol className="mt-8 space-y-4">
        {STAGE_ORDER.slice(0, -1).map((item, index) => {
          const done = index < currentIndex
          const active = index === currentIndex

          return (
            <li key={item} className="flex items-start gap-3.5">
              <span
                className={cn(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-base',
                  done && 'border-success bg-success text-white',
                  active && 'border-accent text-accent',
                  !done && !active && 'border-line text-subtle',
                )}
              >
                {done ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : active ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <span className="text-[10px]">{index + 1}</span>
                )}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    done || active ? 'text-ink' : 'text-subtle',
                  )}
                >
                  {STAGE_LABELS[item].title}
                </p>
                {active && item === 'uploading' && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                    <motion.div
                      className="h-full rounded-full bg-accent"
                      animate={{ width: `${uploadPercent}%` }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-7 border-t border-line pt-5 text-[12px] leading-relaxed text-subtle">
        The model is being called live. This usually takes 15–40 seconds depending on your
        connection and the current free-tier load.
      </p>
    </div>
  )
}
