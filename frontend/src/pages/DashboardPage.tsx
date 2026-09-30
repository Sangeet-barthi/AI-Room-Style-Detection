import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  FileText,
  Gauge,
  History,
  Scan,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { analysisApi } from '@/api/analysis'
import { ProtectedImage } from '@/components/analysis/ProtectedImage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { ScoreRing } from '@/components/ui/score-ring'
import { Skeleton } from '@/components/ui/skeleton'
import { fadeUp, stagger } from '@/lib/motion'
import { formatDate, greeting } from '@/lib/utils'
import { useAuth } from '@/stores/auth'
import type { AnalysisSummary } from '@/types/api'

const CHART_COLORS = [
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--muted))',
  'hsl(var(--danger))',
  'hsl(var(--subtle))',
  'hsl(var(--ink))',
]

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Gauge
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-md bg-accent/10">
          <Icon className="size-4 text-accent" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 font-display text-3xl font-medium text-ink">{value}</p>
      <p className="mt-1 text-[13px] text-muted">{label}</p>
      {hint && <p className="mt-2 text-[12px] text-subtle">{hint}</p>}
    </Card>
  )
}

function RecentCard({ item }: { item: AnalysisSummary }) {
  return (
    <Link
      to={`/analysis/${item.id}`}
      className="group block overflow-hidden rounded-lg border border-line bg-surface transition-all duration-base ease-premium hover:-translate-y-1 hover:shadow-card"
    >
      <ProtectedImage
        url={item.thumbnail_url}
        alt={`${item.room_type} analysed as ${item.primary_style}`}
        className="aspect-[4/3] w-full"
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-ink">{item.room_type}</p>
            <p className="mt-0.5 text-[13px] text-muted">{item.primary_style}</p>
          </div>
          <Badge variant={item.overall_score >= 75 ? 'success' : item.overall_score >= 55 ? 'warning' : 'danger'}>
            {item.overall_score}
          </Badge>
        </div>
        <p className="mt-3 text-[12px] text-subtle">{formatDate(item.created_at)}</p>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  useEffect(() => {
    document.title = 'Dashboard · RoomStyle AI'
  }, [])

  const statsQuery = useQuery({ queryKey: ['stats'], queryFn: analysisApi.stats })
  const recentQuery = useQuery({
    queryKey: ['analyses', { page: 1, page_size: 6 }],
    queryFn: () => analysisApi.list({ page: 1, page_size: 6 }),
  })

  const firstName = user?.full_name.split(' ')[0] ?? 'there'
  const stats = statsQuery.data
  const recent = recentQuery.data?.items ?? []

  return (
    <motion.div variants={stagger(0.05, 0.08)} initial="hidden" animate="visible" className="space-y-10">
      <motion.header variants={fadeUp}>
        <p className="kicker">{greeting()}, {firstName}</p>
        <h1 className="mt-3 text-headline">Ready to understand your space?</h1>
        <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-muted">
          Upload a photograph and get a style reading, a room-health score and a costed plan in
          about a minute.
        </p>
      </motion.header>

      {/* Primary action */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-accent/25 bg-charcoal p-0 text-canvas">
          <div className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="max-w-lg">
              <Badge variant="accent" className="mb-4">
                <Sparkles className="size-3" aria-hidden="true" />
                Start here
              </Badge>
              <h2 className="font-display text-2xl leading-tight text-canvas sm:text-3xl">
                Analyze a new room
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-canvas/60">
                Shoot from a doorway or corner so the frame includes the floor, one full wall and
                any window. Daylight helps.
              </p>
            </div>
            <Button asChild size="lg" variant="accent" className="shrink-0">
              <Link to="/analyze">
                <Scan aria-hidden="true" />
                Analyze My Room
              </Link>
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.section variants={fadeUp} aria-label="Your statistics">
        {statsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : statsQuery.isError ? (
          <ErrorState error={statsQuery.error} onRetry={() => statsQuery.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Scan} label="Rooms analysed" value={String(stats?.total_analyses ?? 0)} />
            <StatCard
              icon={Gauge}
              label="Average room health"
              value={stats?.total_analyses ? `${stats.average_health_score}` : '—'}
              hint="Visual AI-assisted assessment"
            />
            <StatCard icon={FileText} label="Reports created" value={String(stats?.reports_created ?? 0)} />
            <StatCard
              icon={History}
              label="Latest analysis"
              value={stats?.latest ? stats.latest.primary_style : '—'}
              hint={stats?.latest ? formatDate(stats.latest.created_at) : 'No analyses yet'}
            />
          </div>
        )}
      </motion.section>

      {/* Charts */}
      {stats && stats.total_analyses > 0 && (
        <motion.section variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-display text-lg text-ink">Style distribution</h2>
            <p className="mt-1 text-[13px] text-muted">Which design languages your rooms speak</p>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.style_distribution} margin={{ left: -22, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--line))" vertical={false} />
                  <XAxis
                    dataKey="style"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--elevated))' }}
                    contentStyle={{
                      background: 'hsl(var(--surface))',
                      border: '1px solid hsl(var(--line))',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {stats.style_distribution.map((entry, index) => (
                      <Cell key={entry.style} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg text-ink">Room health trend</h2>
                <p className="mt-1 text-[13px] text-muted">Overall score across recent analyses</p>
              </div>
              <TrendingUp className="size-4 text-accent" aria-hidden="true" />
            </div>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.score_trend} margin={{ left: -22, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--line))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--surface))',
                      border: '1px solid hsl(var(--line))',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'hsl(var(--accent))' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.section>
      )}

      {/* Recent analyses */}
      <motion.section variants={fadeUp} aria-label="Recent analyses">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl text-ink">Recent analyses</h2>
          {recent.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/history">
                View all
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>

        {recentQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : recentQuery.isError ? (
          <ErrorState error={recentQuery.error} onRetry={() => recentQuery.refetch()} />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Scan}
            title="No analyses yet"
            description="Your first room analysis will appear here, along with its score, recommendations and report."
            action={
              <Button asChild>
                <Link to="/analyze">
                  <Scan aria-hidden="true" />
                  Analyze your first room
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((item) => (
              <RecentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </motion.section>

      {stats && stats.total_analyses > 0 && stats.latest && (
        <motion.section variants={fadeUp}>
          <Card className="flex flex-col items-center gap-8 p-8 sm:flex-row sm:p-10">
            <ScoreRing score={stats.average_health_score} size={140} label="Average" />
            <div>
              <h2 className="font-display text-xl text-ink">
                Your rooms average {stats.average_health_score} out of 100
              </h2>
              <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-muted">
                That figure is the mean of every room you have analysed, weighted the same way each
                individual score is: lighting 35%, ventilation 25%, space utilisation 40%.
              </p>
              <Badge variant="outline" className="mt-4">
                Visual AI-assisted assessment
              </Badge>
            </div>
          </Card>
        </motion.section>
      )}
    </motion.div>
  )
}
