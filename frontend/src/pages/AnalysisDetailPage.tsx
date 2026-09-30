import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Download,
  FileText,
  Lightbulb,
  Ruler,
  Sparkles,
  Trash2,
  Wind,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { analysisApi } from '@/api/analysis'
import { ApiError } from '@/api/client'
import { makeoverApi } from '@/api/makeover'
import { reportApi } from '@/api/reports'
import { BeforeAfterSlider } from '@/components/analysis/BeforeAfterSlider'
import { BudgetCard } from '@/components/analysis/BudgetCard'
import { ColorPalette } from '@/components/analysis/ColorPalette'
import { DesignMockup } from '@/components/analysis/DesignMockup'
import { FurnitureCard, MaterialCard } from '@/components/analysis/DetailCards'
import { ProtectedImage } from '@/components/analysis/ProtectedImage'
import { RecommendationCard } from '@/components/analysis/RecommendationCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { ScoreBar } from '@/components/ui/score-bar'
import { ScoreRing } from '@/components/ui/score-ring'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { useCapabilities } from '@/hooks/use-capabilities'
import { useProtectedImage } from '@/hooks/use-protected-image'
import { fadeUp, stagger } from '@/lib/motion'
import { formatDateTime } from '@/lib/utils'
import type { DesignStyle, ImprovementCategory } from '@/types/api'

const CATEGORY_SECTIONS: { key: ImprovementCategory; title: string; blurb: string }[] = [
  { key: 'quick', title: 'Quick improvements', blurb: 'Little or no spend, immediate effect' },
  { key: 'lighting', title: 'Lighting improvements', blurb: 'Daylight, layers and evening usability' },
  { key: 'furniture', title: 'Furniture improvements', blurb: 'Pieces, placement and circulation' },
  { key: 'color', title: 'Colour improvements', blurb: 'Palette coherence and temperature' },
  { key: 'material', title: 'Material improvements', blurb: 'Texture, finish and tactile quality' },
  { key: 'decor', title: 'Decor improvements', blurb: 'Objects, art and the finishing layer' },
]

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-80 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function AnalysisDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: capabilities } = useCapabilities()

  const [targetStyle, setTargetStyle] = useState<DesignStyle>('Minimalist')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const analysisQuery = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => analysisApi.get(id),
    enabled: Boolean(id),
  })

  const detail = analysisQuery.data
  const originalImage = detail?.images.find((image) => image.image_type === 'original')
  const { src: originalSrc } = useProtectedImage(originalImage?.url)

  const activeMakeover = useMemo(
    () => detail?.makeovers.find((item) => item.target_style === targetStyle) ?? null,
    [detail, targetStyle],
  )
  const { src: makeoverSrc } = useProtectedImage(activeMakeover?.image_url)

  useEffect(() => {
    if (detail) document.title = `${detail.room_type} · ${detail.primary_style} · RoomStyle AI`
  }, [detail])

  const makeoverMutation = useMutation({
    mutationFn: () => makeoverApi.create(id, targetStyle),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['analysis', id] })
      toast({
        title: result.kind === 'ai_concept' ? 'Concept ready' : 'Design mockup ready',
        description:
          result.kind === 'ai_concept'
            ? 'Your AI concept visualization has been generated.'
            : result.note ?? 'Showing the deterministic design mockup.',
        tone: result.kind === 'ai_concept' ? 'success' : 'info',
      })
    },
    onError: (error) =>
      toast({
        title: 'Visualization failed',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        tone: 'error',
      }),
  })

  const reportMutation = useMutation({
    mutationFn: () => reportApi.generate(id),
    onSuccess: async (report) => {
      queryClient.invalidateQueries({ queryKey: ['analysis', id] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast({ title: 'Report generated', description: report.file_name, tone: 'success' })
      await reportApi.download(report)
    },
    onError: (error) =>
      toast({
        title: 'Report failed',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        tone: 'error',
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => analysisApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast({ title: 'Analysis deleted', tone: 'info' })
      navigate('/history', { replace: true })
    },
  })

  if (analysisQuery.isLoading) return <DetailSkeleton />
  if (analysisQuery.isError || !detail) {
    return <ErrorState error={analysisQuery.error} onRetry={() => analysisQuery.refetch()} />
  }

  const { analysis, scores } = detail
  const confidence = Math.round(detail.style_confidence * 100)

  return (
    <motion.div variants={stagger(0.04, 0.07)} initial="hidden" animate="visible" className="space-y-10">
      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/history">
            <ArrowLeft aria-hidden="true" />
            Back to history
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={reportMutation.isPending}
            onClick={() => reportMutation.mutate()}
          >
            <FileText aria-hidden="true" />
            {reportMutation.isPending ? 'Generating…' : 'Generate PDF report'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      </motion.div>

      {/* Hero result */}
      <motion.section variants={fadeUp} aria-label="Analysis summary">
        <Card className="overflow-hidden p-0">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            <ProtectedImage
              url={originalImage?.url}
              alt={`Your ${detail.room_type.toLowerCase()} photograph`}
              className="aspect-[4/3] w-full lg:aspect-auto lg:h-full"
            />
            <div className="p-8 lg:p-10">
              <p className="kicker">{detail.room_type}</p>
              <h1 className="mt-4 font-display text-5xl font-medium leading-none text-ink">
                {detail.primary_style}
              </h1>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="font-display text-3xl font-medium text-accent">{confidence}%</span>
                <span className="text-[13px] text-muted">AI confidence estimate</span>
              </div>

              {analysis.alternative_styles.length > 0 && (
                <div className="mt-7">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">
                    Also considered
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {analysis.alternative_styles.map((alt) => (
                      <li key={alt.style}>
                        <Badge variant="outline">
                          {alt.style} · {Math.round(alt.confidence_estimate * 100)}%
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="mt-8 grid grid-cols-2 gap-5 border-t border-line pt-6 text-[13px]">
                <div>
                  <dt className="text-subtle">Wall colour</dt>
                  <dd className="mt-1 font-medium text-ink">{analysis.wall_color}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Flooring</dt>
                  <dd className="mt-1 font-medium text-ink">{analysis.flooring}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Palette temperature</dt>
                  <dd className="mt-1 font-medium capitalize text-ink">
                    {analysis.color_temperature}
                  </dd>
                </div>
                <div>
                  <dt className="text-subtle">Analysed</dt>
                  <dd className="mt-1 font-medium text-ink">{formatDateTime(detail.created_at)}</dd>
                </div>
              </dl>

              {analysis.uncertainty_notes && (
                <p className="mt-6 rounded-md bg-elevated p-4 text-[12px] leading-relaxed text-muted">
                  {analysis.uncertainty_notes}
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.section>

      <motion.div variants={fadeUp}>
        <Tabs defaultValue="overview">
          <TabsList className="w-full overflow-x-auto no-scrollbar">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Room health</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="makeover">Before / after</TabsTrigger>
          </TabsList>

          {/* ---------------- Overview ---------------- */}
          <TabsContent value="overview" className="space-y-10">
            <section>
              <h2 className="font-display text-xl text-ink">Why this style</h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
                {analysis.style_explanation}
              </p>
              {analysis.style_evidence.length > 0 && (
                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {analysis.style_evidence.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 rounded-md border border-line bg-surface p-4 text-[13px] leading-relaxed text-ink"
                    >
                      <span className="mt-[7px] size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-display text-xl text-ink">Dominant colours</h2>
              <p className="mt-2 text-[13px] text-muted">
                Sampled from the photograph; hex values are approximate.
              </p>
              <div className="mt-5">
                <ColorPalette colors={analysis.dominant_colors} />
              </div>
            </section>

            {analysis.furniture.length > 0 && (
              <section>
                <h2 className="font-display text-xl text-ink">Furniture detected</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {analysis.furniture.map((item) => (
                    <FurnitureCard key={item.name} item={item} />
                  ))}
                </div>
              </section>
            )}

            {analysis.materials.length > 0 && (
              <section>
                <h2 className="font-display text-xl text-ink">Materials detected</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {analysis.materials.map((item) => (
                    <MaterialCard key={item.name} item={item} />
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="font-display text-lg text-ink">Strengths</h3>
                <ul className="mt-4 space-y-2.5">
                  {analysis.strengths.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
                      <span className="mt-[7px] size-1 shrink-0 rounded-full bg-success" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <h3 className="font-display text-lg text-ink">Holding it back</h3>
                <ul className="mt-4 space-y-2.5">
                  {analysis.weaknesses.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
                      <span className="mt-[7px] size-1 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          </TabsContent>

          {/* ---------------- Room health ---------------- */}
          <TabsContent value="health" className="space-y-8">
            <Card className="flex flex-col items-center gap-9 p-8 sm:flex-row sm:p-10">
              <ScoreRing score={scores.overall.score} size={170} caption="room health" />
              <div className="min-w-0">
                <h2 className="font-display text-2xl text-ink">Overall room health</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  {scores.overall.summary}
                </p>
                <p className="mt-4 font-mono text-[12px] text-subtle">{scores.overall.formula}</p>
                <Badge variant="outline" className="mt-4">
                  {scores.overall.disclaimer}
                </Badge>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              {[
                { key: 'lighting', title: 'Lighting', icon: Lightbulb, data: scores.lighting },
                { key: 'ventilation', title: 'Ventilation', icon: Wind, data: scores.ventilation },
                {
                  key: 'space_utilization',
                  title: 'Space utilisation',
                  icon: Ruler,
                  data: scores.space_utilization,
                },
              ].map(({ key, title, icon: Icon, data }) => (
                <Card key={key} className="flex flex-col p-6">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-md bg-accent/10">
                      <Icon className="size-4 text-accent" aria-hidden="true" />
                    </span>
                    <h3 className="text-[15px] font-medium text-ink">{title}</h3>
                  </div>
                  <div className="mt-6">
                    <ScoreBar label={title} score={data.score} description={data.summary} />
                  </div>
                  <ul className="mt-5 space-y-2 border-t border-line pt-4">
                    {data.factors.map((factor) => (
                      <li key={factor} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-muted">
                        <span className="mt-[6px] size-1 shrink-0 rounded-full bg-subtle" aria-hidden="true" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>

            <p className="rounded-md border border-line bg-elevated p-5 text-[12px] leading-relaxed text-muted">
              These are visual estimates derived from a single photograph. They are not professional
              architectural, structural, ventilation, lighting, safety or environmental
              measurements.
            </p>
          </TabsContent>

          {/* ---------------- Recommendations ---------------- */}
          <TabsContent value="recommendations" className="space-y-10">
            {detail.improvements.summary && (
              <Card className="p-7">
                <h2 className="font-display text-xl text-ink">What matters most</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  {detail.improvements.summary}
                </p>
              </Card>
            )}

            {CATEGORY_SECTIONS.map((section) => {
              const items = detail.improvements.improvements.filter(
                (item) => item.category === section.key,
              )
              if (items.length === 0) return null
              return (
                <section key={section.key}>
                  <h2 className="font-display text-xl text-ink">{section.title}</h2>
                  <p className="mt-1.5 text-[13px] text-muted">{section.blurb}</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item, index) => (
                      <RecommendationCard key={item.title} item={item} index={index} />
                    ))}
                  </div>
                </section>
              )
            })}

            {detail.improvements.improvements.length === 0 && (
              <EmptyState
                icon={Sparkles}
                title="No recommendations stored"
                description="This analysis was saved without a recommendation plan. Run a new analysis to generate one."
              />
            )}
          </TabsContent>

          {/* ---------------- Budgets ---------------- */}
          <TabsContent value="budgets">
            {detail.budget_plans.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No budget packages stored"
                description="Budget packages are generated alongside a new analysis."
              />
            ) : (
              <Tabs defaultValue={String(detail.budget_plans[0].budget)}>
                <TabsList>
                  {detail.budget_plans.map((plan) => (
                    <TabsTrigger key={plan.budget} value={String(plan.budget)}>
                      ₹{plan.budget.toLocaleString('en-IN')}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {detail.budget_plans.map((plan) => (
                  <TabsContent key={plan.budget} value={String(plan.budget)}>
                    <BudgetCard plan={plan} />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>

          {/* ---------------- Makeover ---------------- */}
          <TabsContent value="makeover" className="space-y-6">
            <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="sm:max-w-md">
                <h2 className="font-display text-xl text-ink">Visualise a target style</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  {capabilities?.image_generation_enabled
                    ? 'Generates an AI concept visualization that preserves your room type and architecture. Existing concepts are reused, so you are never charged twice for the same style.'
                    : 'AI image generation is not enabled on this deployment, so you will get the deterministic design mockup — palette, furniture, lighting and material changes for the target style.'}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  value={targetStyle}
                  onValueChange={(value) => setTargetStyle(value as DesignStyle)}
                >
                  <SelectTrigger className="w-full sm:w-44" aria-label="Target style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(capabilities?.supported_styles ?? []).map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  loading={makeoverMutation.isPending}
                  onClick={() => makeoverMutation.mutate()}
                >
                  <Sparkles aria-hidden="true" />
                  {makeoverMutation.isPending ? 'Creating…' : 'Generate'}
                </Button>
              </div>
            </Card>

            {makeoverMutation.isPending && (
              <Card className="p-8 text-center">
                <p className="text-[15px] font-medium text-ink">
                  Creating your AI concept visualization…
                </p>
                <p className="mt-2 text-[13px] text-muted">
                  If generation is unavailable we will fall back to the design mockup automatically.
                </p>
                <Skeleton className="mt-6 aspect-[4/3] w-full rounded-lg" />
              </Card>
            )}

            {!makeoverMutation.isPending && activeMakeover && (
              <div className="space-y-6">
                {makeoverSrc && originalSrc ? (
                  <BeforeAfterSlider
                    beforeSrc={originalSrc}
                    afterSrc={makeoverSrc}
                    makeover={activeMakeover}
                    onDownload={() => {
                      const anchor = document.createElement('a')
                      anchor.href = makeoverSrc
                      anchor.download = `roomstyle-${activeMakeover.target_style.toLowerCase()}.png`
                      anchor.click()
                    }}
                  />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="overflow-hidden p-0">
                      <div className="border-b border-line px-5 py-3">
                        <Badge variant="ink">Before</Badge>
                      </div>
                      <ProtectedImage
                        url={originalImage?.url}
                        alt="Your original room photograph"
                        className="aspect-[4/3] w-full"
                      />
                    </Card>
                    <DesignMockup makeover={activeMakeover} />
                  </div>
                )}
              </div>
            )}

            {!makeoverMutation.isPending && !activeMakeover && (
              <EmptyState
                icon={Sparkles}
                title={`No ${targetStyle} visualization yet`}
                description="Pick a target style and generate a before/after view. Nothing is generated until you ask for it."
                action={
                  <Button onClick={() => makeoverMutation.mutate()}>
                    <Sparkles aria-hidden="true" />
                    Generate {targetStyle} concept
                  </Button>
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {detail.reports.length > 0 && (
        <motion.section variants={fadeUp}>
          <h2 className="font-display text-xl text-ink">Reports for this room</h2>
          <ul className="mt-5 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {detail.reports.map((report) => (
              <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{report.file_name}</p>
                  <p className="mt-0.5 text-[12px] text-subtle">
                    {formatDateTime(report.created_at)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => reportApi.download(report)}>
                  <Download aria-hidden="true" />
                  Download
                </Button>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this analysis?</DialogTitle>
            <DialogDescription>
              This permanently removes the photograph, the scores, the recommendations and any
              reports generated from it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 aria-hidden="true" />
              Delete analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
