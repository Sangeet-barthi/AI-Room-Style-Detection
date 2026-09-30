import {
  Camera,
  ChevronDown,
  Download,
  FileText,
  Lightbulb,
  type LucideIcon,
  Palette,
  Ruler,
  Scan,
  Shield,
  Sofa,
  Sparkles,
  Wind,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { RoomIllustration } from '@/components/branding/RoomIllustration'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScoreBar } from '@/components/ui/score-bar'
import { ScoreRing } from '@/components/ui/score-ring'
import { fadeUp, revealViewport, stagger } from '@/lib/motion'
import { cn, inr } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Shared section scaffolding                                          */
/* ------------------------------------------------------------------ */

interface SectionProps {
  id?: string
  kicker: string
  title: React.ReactNode
  description?: string
  children?: React.ReactNode
  className?: string
  align?: 'left' | 'center'
}

function Section({
  id,
  kicker,
  title,
  description,
  children,
  className,
  align = 'left',
}: SectionProps) {
  return (
    <section id={id} className={cn('py-section', className)}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.header
          variants={stagger(0, 0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}
        >
          <motion.p variants={fadeUp} className="kicker">
            {kicker}
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-4 text-headline text-balance">
            {title}
          </motion.h2>
          {description && (
            <motion.p
              variants={fadeUp}
              className="mt-4 text-[16px] leading-relaxed text-muted"
            >
              {description}
            </motion.p>
          )}
        </motion.header>
        {children}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Problem                                                          */
/* ------------------------------------------------------------------ */

const PROBLEMS = [
  {
    title: 'You know something is off',
    body: 'The room feels heavy, or dim, or somehow unfinished — but naming the actual cause is the hard part.',
  },
  {
    title: 'Advice arrives without context',
    body: 'Generic "add a rug and some plants" tips ignore your wall colour, your window, and the furniture you already own.',
  },
  {
    title: 'Budget turns into guesswork',
    body: 'Without costed priorities it is easy to spend ₹40,000 on the thing that mattered third.',
  },
]

export function ProblemSection() {
  return (
    <Section
      kicker="The problem"
      title="Most rooms are diagnosed by instinct"
      description="A designer reads a space in layers — light, proportion, material, palette. Without that vocabulary, improving a room becomes trial and error at full retail price."
      className="border-y border-line bg-elevated/40"
    >
      <motion.div
        variants={stagger(0.1, 0.1)}
        initial="hidden"
        whileInView="visible"
        viewport={revealViewport}
        className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3"
      >
        {PROBLEMS.map((item, index) => (
          <motion.article key={item.title} variants={fadeUp} className="bg-canvas p-8">
            <span className="font-display text-3xl text-subtle">0{index + 1}</span>
            <h3 className="mt-5 text-[17px] font-medium text-ink">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
          </motion.article>
        ))}
      </motion.div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 3. How it works                                                     */
/* ------------------------------------------------------------------ */

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Camera,
    title: 'Capture the room',
    body: 'Upload a photo or shoot one directly from your phone. One wide frame that shows the floor, a wall and any window works best.',
  },
  {
    icon: Scan,
    title: 'The model reads it',
    body: 'A multimodal vision model catalogues what is genuinely visible — furniture, materials, wall and floor finish, palette, windows and circulation.',
  },
  {
    icon: Ruler,
    title: 'The backend scores it',
    body: 'Those observations feed a transparent scoring formula. Lighting, ventilation and space utilisation are calculated in code, not improvised by the model.',
  },
  {
    icon: FileText,
    title: 'You get a plan',
    body: 'An explained style assessment, prioritised improvements, three costed makeover packages and a PDF you can take to a carpenter.',
  },
]

export function HowItWorksSection() {
  return (
    <Section
      id="how-it-works"
      kicker="How it works"
      title="Four steps from photograph to plan"
      description="No measuring tape, no floor plan, no appointment. Just one honest photo of the room as it is today."
    >
      <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.ol
          variants={stagger(0.1, 0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          className="relative space-y-10 border-l border-line pl-8"
        >
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <motion.li key={title} variants={fadeUp} className="relative">
              <span className="absolute -left-[41px] flex size-[26px] items-center justify-center rounded-full border border-line bg-canvas text-[11px] font-semibold text-accent">
                {index + 1}
              </span>
              <div className="flex items-center gap-2.5">
                <Icon className="size-4 text-accent" aria-hidden="true" />
                <h3 className="text-[17px] font-medium text-ink">{title}</h3>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{body}</p>
            </motion.li>
          ))}
        </motion.ol>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={revealViewport}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <Card className="overflow-hidden p-0">
            <RoomIllustration className="aspect-[5/4] w-full" />
            <div className="border-t border-line p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Detected</p>
                  <p className="mt-1 font-display text-xl text-ink">Living Room · Modern</p>
                </div>
                <ScoreRing score={87} size={78} strokeWidth={7} caption="health" />
              </div>
              <div className="mt-6 space-y-4">
                <ScoreBar label="Lighting" score={91} />
                <ScoreBar label="Ventilation" score={72} />
                <ScoreBar label="Space utilisation" score={89} />
              </div>
              <p className="mt-6 text-[11px] leading-relaxed text-subtle">
                Visual AI-assisted assessment. Scores describe what is visible in one photograph,
                not measured light levels or airflow.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Capabilities                                                     */
/* ------------------------------------------------------------------ */

const CAPABILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Palette,
    title: 'Style identification',
    body: 'Seven design languages, each matched against a written rubric and returned with the visual evidence that justified it.',
  },
  {
    icon: Sofa,
    title: 'Furniture & materials',
    body: 'Every identified piece is labelled observed or inferred, so you know what the model actually saw versus what it read between the lines.',
  },
  {
    icon: Lightbulb,
    title: 'Lighting assessment',
    body: 'Daylight source, window openness, apparent brightness and how evenly the visible fixtures cover the room.',
  },
  {
    icon: Wind,
    title: 'Ventilation indicators',
    body: 'Counts openable windows, doors and cross-flow opportunities. It reports visible openings, never air quality.',
  },
  {
    icon: Ruler,
    title: 'Space utilisation',
    body: 'Furniture density, walking clearance, clutter and whether vertical wall area is doing any work.',
  },
  {
    icon: Shield,
    title: 'Honest uncertainty',
    body: 'Confidence is shown as an estimate, alternative styles stay on the table, and a poor photo lowers the score instead of hiding it.',
  },
]

export function CapabilitiesSection() {
  return (
    <Section
      id="features"
      kicker="What the AI sees"
      title="A structured reading, not a vibe check"
      description="Each analysis returns the same schema every time, which is what makes the scores comparable between rooms and across time."
      className="border-y border-line bg-elevated/40"
    >
      <motion.div
        variants={stagger(0.08, 0.08)}
        initial="hidden"
        whileInView="visible"
        viewport={revealViewport}
        className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {CAPABILITIES.map(({ icon: Icon, title, body }) => (
          <motion.div key={title} variants={fadeUp}>
            <Card className="group h-full p-7 transition-all duration-base ease-premium hover:-translate-y-1 hover:shadow-card">
              <span className="flex size-10 items-center justify-center rounded-md bg-accent/10">
                <Icon className="size-4.5 text-accent" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-[17px] font-medium text-ink">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{body}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 5. Style categories                                                 */
/* ------------------------------------------------------------------ */

const STYLES = [
  {
    name: 'Modern',
    evidence: 'Clean lines, neutral palette, glass and metal, uncluttered layout',
    swatches: ['#2F3134', '#F5F3EF', '#B7B2AA', '#B08D57'],
  },
  {
    name: 'Minimalist',
    evidence: 'Limited furniture, generous negative space, concealed storage',
    swatches: ['#F8F7F4', '#D9CDBB', '#4A4A48', '#E6DFD4'],
  },
  {
    name: 'Luxury',
    evidence: 'Marble, layered lighting, rich textures, statement furniture',
    swatches: ['#3B2F2A', '#EFECE6', '#C6A15B', '#26313C'],
  },
  {
    name: 'Classic',
    evidence: 'Symmetry, refined mouldings, timeless proportion, balanced palette',
    swatches: ['#F1EADD', '#9FAB94', '#6B4A32', '#CBB185'],
  },
  {
    name: 'Traditional',
    evidence: 'Heritage furniture, decorative pattern, carved detail, warm wood',
    swatches: ['#B5643C', '#D9A441', '#5A3A24', '#EFE3CD'],
  },
  {
    name: 'Rustic',
    evidence: 'Exposed grain, natural texture, earthy colour, handmade objects',
    swatches: ['#7A5C42', '#A8755A', '#6E7355', '#E3D8C5'],
  },
  {
    name: 'Coastal',
    evidence: 'Light airy palette, blue and white, rattan and jute, relaxed forms',
    swatches: ['#F4F7F7', '#4E7B96', '#C6B7A2', '#BFD6E0'],
  },
]

export function StylesSection() {
  return (
    <Section
      kicker="Style taxonomy"
      title="Seven design languages"
      description="Every classification is matched against explicit visual markers, and the closest runner-up is always reported alongside it."
    >
      <motion.div
        variants={stagger(0.06, 0.06)}
        initial="hidden"
        whileInView="visible"
        viewport={revealViewport}
        className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {STYLES.map((style) => (
          <motion.article
            key={style.name}
            variants={fadeUp}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-lg border border-line bg-surface p-6"
          >
            <div className="flex gap-1.5" aria-hidden="true">
              {style.swatches.map((hex) => (
                <span
                  key={hex}
                  className="h-9 flex-1 rounded-sm border border-line/60"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <h3 className="mt-5 font-display text-xl text-ink">{style.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{style.evidence}</p>
          </motion.article>
        ))}
      </motion.div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 6. Room health scoring                                              */
/* ------------------------------------------------------------------ */

const SCORE_INPUTS = [
  {
    title: 'Lighting · 35%',
    items: [
      'Visible natural light source',
      'Window openness relative to the wall',
      'Apparent overall brightness',
      'Distribution of visible fixtures',
    ],
  },
  {
    title: 'Ventilation · 25%',
    items: [
      'Openable windows in frame',
      'Doors and other openings',
      'Cross-flow across more than one wall',
      'How enclosed the room reads',
    ],
  },
  {
    title: 'Space utilisation · 40%',
    items: [
      'Furniture density',
      'Walking clearance between pieces',
      'Visible clutter on surfaces',
      'Whether vertical storage is used',
    ],
  },
]

export function ScoringSection() {
  return (
    <Section
      kicker="Room health"
      title="Scores you can actually audit"
      description="The model contributes observations. The arithmetic lives in the backend, with fixed weights you can read, change and test."
      className="bg-charcoal text-canvas"
    >
      <div className="mt-14 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={revealViewport}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center justify-center rounded-xl border border-canvas/10 bg-canvas/[0.04] p-10"
        >
          <ScoreRing score={87} size={190} strokeWidth={11} caption="room health" />
          <p className="mt-8 text-center text-sm leading-relaxed text-canvas/60">
            overall = lighting×0.35 + ventilation×0.25 + space×0.40
          </p>
          <Badge variant="outline" className="mt-5 border-canvas/20 text-canvas/70">
            Visual AI-assisted assessment
          </Badge>
        </motion.div>

        <motion.div
          variants={stagger(0.1, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          className="space-y-8"
        >
          {SCORE_INPUTS.map((group) => (
            <motion.div
              key={group.title}
              variants={fadeUp}
              className="border-t border-canvas/10 pt-7 first:border-t-0 first:pt-0"
            >
              <h3 className="font-display text-xl text-canvas">{group.title}</h3>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-canvas/60">
                    <span
                      className="mt-[7px] size-1 shrink-0 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
          <motion.p variants={fadeUp} className="text-[13px] leading-relaxed text-canvas/40">
            These are visual estimates from a single photograph. They are not professional
            architectural, structural, ventilation, lighting, safety or environmental measurements.
          </motion.p>
        </motion.div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 7. Budget makeovers                                                 */
/* ------------------------------------------------------------------ */

const PACKAGES = [
  {
    budget: 5000,
    title: 'Weekend refresh',
    body: 'Textiles, a second light source and storage that removes visible clutter.',
    items: ['Layered curtains', 'Warm LED floor lamp', 'Woven storage baskets'],
  },
  {
    budget: 20000,
    title: 'Room-level upgrade',
    body: 'Zoning, a full lighting layer and one furniture piece that anchors the palette.',
    items: ['Area rug', 'Three-point lighting', 'Wall shelving', 'Coordinated soft furnishings'],
    featured: true,
  },
  {
    budget: 50000,
    title: 'Considered transformation',
    body: 'A statement piece, a controllable lighting scheme and a resolved wall finish.',
    items: ['Replacement seating', 'Dimmable lighting scheme', 'Feature wall', 'Custom storage'],
  },
]

export function BudgetSection() {
  return (
    <Section
      kicker="Budget makeovers"
      title="Three plans. None of them over budget."
      description="Each package is validated in code after the model proposes it, so the total never exceeds the number on the card."
      className="border-y border-line bg-elevated/40"
    >
      <motion.div
        variants={stagger(0.1, 0.1)}
        initial="hidden"
        whileInView="visible"
        viewport={revealViewport}
        className="mt-14 grid gap-5 lg:grid-cols-3"
      >
        {PACKAGES.map((pack) => (
          <motion.div key={pack.budget} variants={fadeUp}>
            <Card
              className={cn(
                'flex h-full flex-col p-8 transition-all duration-base ease-premium hover:-translate-y-1 hover:shadow-card',
                pack.featured && 'border-accent/40 shadow-card',
              )}
            >
              {pack.featured && (
                <Badge variant="accent" className="mb-5 w-fit">
                  Most chosen
                </Badge>
              )}
              <p className="font-display text-4xl font-medium text-ink">{inr(pack.budget)}</p>
              <h3 className="mt-3 text-[17px] font-medium text-ink">{pack.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{pack.body}</p>
              <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
                {pack.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                    <span
                      className="mt-[7px] size-1 shrink-0 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[11px] text-subtle">
                Costs are estimates at typical Indian retail prices.
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 8 & 9. Visualization + report preview                               */
/* ------------------------------------------------------------------ */

export function VisualizationSection() {
  return (
    <Section
      kicker="Before / after"
      title="See the change before you spend"
      description="Pick a target style and RoomStyle AI composes a concept view alongside your original photo — or a deterministic design mockup when image generation is unavailable."
    >
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={revealViewport}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-subtle">Before</span>
              <Badge variant="outline">Your photo</Badge>
            </div>
            <RoomIllustration className="aspect-[4/3] w-full" />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={revealViewport}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <Card className="flex h-full flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-subtle">After</span>
              <Badge variant="accent">
                <Sparkles className="size-3" aria-hidden="true" />
                AI Concept Visualization
              </Badge>
            </div>
            <RoomIllustration variant="dark" className="aspect-[4/3] w-full" />
            <div className="flex-1 border-t border-line p-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Target palette</p>
              <div className="mt-3 flex gap-1.5" aria-hidden="true">
                {['#F8F7F4', '#D9CDBB', '#4A4A48', '#E6DFD4'].map((hex) => (
                  <span
                    key={hex}
                    className="h-8 flex-1 rounded-sm border border-line"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </Section>
  )
}

const REPORT_CONTENTS = [
  'Cover with your original photograph',
  'Executive summary and detected style',
  'Furniture, materials, palette and finishes',
  'Lighting, ventilation and space scores',
  'Prioritised improvement table',
  'All three costed makeover packages',
  'Before / after visualization',
  'Scope and limitations disclaimer',
]

export function ReportSection() {
  return (
    <Section
      kicker="The deliverable"
      title="A report you would not be embarrassed to hand over"
      description="Generated server-side with ReportLab and downloaded as a real PDF — cover page, typographic hierarchy, score meters, palette strips and costed tables."
      className="border-y border-line bg-elevated/40"
    >
      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <motion.ul
          variants={stagger(0.05, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2"
        >
          {REPORT_CONTENTS.map((item) => (
            <motion.li
              key={item}
              variants={fadeUp}
              className="flex items-start gap-3 bg-canvas p-5 text-sm text-muted"
            >
              <FileText className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              {item}
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={revealViewport}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="overflow-hidden p-0 shadow-lift">
            <div className="bg-charcoal p-8 text-canvas">
              <p className="text-[10px] uppercase tracking-[0.18em] text-canvas/50">
                RoomStyle AI · Interior analysis
              </p>
              <p className="mt-5 font-display text-3xl leading-tight">
                Living Room
                <br />
                <span className="text-accent">Modern</span>
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-canvas/10 pt-5 text-[11px]">
                <div>
                  <p className="text-canvas/40">CONFIDENCE ESTIMATE</p>
                  <p className="mt-1 text-sm text-canvas">92%</p>
                </div>
                <div>
                  <p className="text-canvas/40">ROOM HEALTH</p>
                  <p className="mt-1 text-sm text-canvas">87/100</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-sm text-muted">RoomStyleAI_LivingRoom_Modern.pdf</span>
              <Download className="size-4 text-accent" aria-hidden="true" />
            </div>
          </Card>
        </motion.div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 10. Technology                                                      */
/* ------------------------------------------------------------------ */

const STACK = [
  { label: 'Frontend', value: 'React · Vite · TypeScript · Tailwind · shadcn/ui · Motion' },
  { label: 'Backend', value: 'FastAPI · Pydantic v2 · SQLAlchemy 2 · Alembic · PostgreSQL' },
  { label: 'Orchestration', value: 'Google GenAI with structured Pydantic outputs' },
  { label: 'Vision', value: 'Pretrained multimodal model via Google AI Studio' },
  { label: 'Scoring', value: 'Deterministic Python — weighted, configurable, unit-tested' },
  { label: 'Reports', value: 'ReportLab server-side PDF generation' },
]

export function TechnologySection() {
  return (
    <Section
      id="technology"
      kicker="Technology"
      title="No model was trained for this"
      description="RoomStyle AI calls a pretrained multimodal model through Google GenAI and keeps every number the user sees under deterministic backend control. That separation is the whole architectural idea."
    >
      <motion.dl
        variants={stagger(0.06, 0.07)}
        initial="hidden"
        whileInView="visible"
        viewport={revealViewport}
        className="mt-14 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
      >
        {STACK.map((row) => (
          <motion.div
            key={row.label}
            variants={fadeUp}
            className="flex flex-col gap-1 p-6 sm:flex-row sm:items-center sm:gap-8"
          >
            <dt className="w-44 shrink-0 text-[11px] uppercase tracking-[0.14em] text-subtle">
              {row.label}
            </dt>
            <dd className="text-sm text-ink">{row.value}</dd>
          </motion.div>
        ))}
      </motion.dl>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 11. FAQ                                                             */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: 'Is this a professional design or architectural assessment?',
    a: 'No. RoomStyle AI is an interior design analysis assistant. Every score is a visual estimate derived from a single photograph, not an architectural, structural, ventilation, lighting, safety or environmental measurement. Treat it as an informed starting point, not a certification.',
  },
  {
    q: 'How accurate is the style confidence number?',
    a: 'It is labelled an AI confidence estimate for a reason. It reflects how strongly the visible evidence matched one style rubric over the others — it is not a calibrated statistical probability, and the closest alternative style is always shown alongside it.',
  },
  {
    q: 'What makes a good photo?',
    a: 'One wide frame taken from a doorway or corner, in daylight if possible, showing the floor, at least one full wall and any window. Avoid heavy filters and extreme close-ups. If the photo is dark or partial, the analysis says so and lowers its own confidence.',
  },
  {
    q: 'Does it cost anything to run?',
    a: 'The core analysis runs on a free-tier multimodal model, and the optional AI makeover image generation is disabled by default. If a provider is out of quota, the app tells you plainly and still shows the deterministic design mockup.',
  },
  {
    q: 'Who can see my room photos?',
    a: 'Only you. Every analysis, image and report is scoped to your account and ownership is verified on the server for each request — not just hidden in the interface.',
  },
]

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <Section
      kicker="Questions"
      title="What this is, and what it is not"
      align="center"
      className="border-y border-line bg-elevated/40"
    >
      <div className="mx-auto mt-14 max-w-3xl divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {FAQS.map((faq, index) => {
          const expanded = open === index
          return (
            <div key={faq.q}>
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : index)}
                  aria-expanded={expanded}
                  aria-controls={`faq-panel-${index}`}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition-colors hover:bg-elevated/60"
                >
                  <span className="text-[15px] font-medium text-ink">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-muted transition-transform duration-base ease-premium',
                      expanded && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    id={`faq-panel-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-sm leading-relaxed text-muted">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 12 & 13. Final CTA + footer                                         */
/* ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <section className="py-section">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={revealViewport}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-2xl border border-line bg-charcoal px-8 py-16 text-center text-canvas sm:px-16"
        >
          <p className="kicker">Start now</p>
          <h2 className="mx-auto mt-5 max-w-2xl text-headline text-balance text-canvas">
            Your room already has an opinion. Find out what it is.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-canvas/60">
            One photograph, one minute, and a plan that fits the budget you actually have.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent">
              <Link to="/register">
                Analyze My Room
                <Sparkles aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-canvas/20 bg-transparent text-canvas hover:bg-canvas/10 hover:text-canvas"
            >
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-line py-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-ink text-canvas">
              <Scan className="size-4" aria-hidden="true" />
            </span>
            <span className="font-display text-[15px] font-medium">RoomStyle AI</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            An AI interior design analysis assistant. It reads rooms, explains what it sees and
            suggests costed improvements — it does not replace a professional survey.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Product</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="#features" className="text-muted transition-colors hover:text-ink">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-muted transition-colors hover:text-ink">
                  How it works
                </a>
              </li>
              <li>
                <a href="#technology" className="text-muted transition-colors hover:text-ink">
                  Technology
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Account</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link to="/login" className="text-muted transition-colors hover:text-ink">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-muted transition-colors hover:text-ink">
                  Create account
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Developers</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="/docs" className="text-muted transition-colors hover:text-ink">
                  API documentation
                </a>
              </li>
              <li>
                <a href="/redoc" className="text-muted transition-colors hover:text-ink">
                  ReDoc reference
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="mx-auto mt-12 max-w-7xl px-5 sm:px-8">
        <p className="border-t border-line pt-8 text-[13px] leading-relaxed text-subtle">
          RoomStyle AI provides AI-assisted visual design analysis intended for inspiration and
          planning. Scores are visual estimates and are not professional architectural, structural,
          ventilation, lighting, safety or environmental measurements.
        </p>
      </div>
    </footer>
  )
}
