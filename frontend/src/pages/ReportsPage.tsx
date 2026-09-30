import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, FileText, Scan } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { reportApi } from '@/api/reports'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { fadeUp, stagger } from '@/lib/motion'
import { formatBytes, formatDateTime } from '@/lib/utils'
import type { ReportSummary } from '@/types/api'

export default function ReportsPage() {
  const { toast } = useToast()

  useEffect(() => {
    document.title = 'Reports · RoomStyle AI'
  }, [])

  const reportsQuery = useQuery({ queryKey: ['reports'], queryFn: reportApi.list })

  const downloadMutation = useMutation({
    mutationFn: (report: ReportSummary) => reportApi.download(report),
    onError: (error) =>
      toast({
        title: 'Download failed',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        tone: 'error',
      }),
  })

  const reports = reportsQuery.data ?? []

  return (
    <motion.div variants={stagger(0.04, 0.07)} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={fadeUp}>
        <PageHeader
          kicker="Deliverables"
          title="Reports"
          description="Every PDF you have generated. Reports are private to your account and are verified server-side on each download."
        />
      </motion.div>

      {reportsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : reportsQuery.isError ? (
        <ErrorState error={reportsQuery.error} onRetry={() => reportsQuery.refetch()} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Open any analysis and generate a PDF report — cover page, scores, recommendations and all three budget packages."
          action={
            <Button asChild>
              <Link to="/history">
                <Scan aria-hidden="true" />
                Go to your analyses
              </Link>
            </Button>
          }
        />
      ) : (
        <motion.ul
          variants={fadeUp}
          className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface"
        >
          {reports.map((report) => (
            <li key={report.id} className="flex flex-wrap items-center gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent/10">
                <FileText className="size-5 text-accent" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{report.file_name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-subtle">
                  <span>{formatDateTime(report.created_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatBytes(report.size_bytes)}</span>
                </p>
              </div>

              {report.primary_style && (
                <Badge variant="outline" className="shrink-0">
                  {report.room_type} · {report.primary_style}
                </Badge>
              )}

              <div className="flex shrink-0 gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/analysis/${report.analysis_id}`}>View analysis</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={downloadMutation.isPending && downloadMutation.variables?.id === report.id}
                  onClick={() => downloadMutation.mutate(report)}
                >
                  <Download aria-hidden="true" />
                  Download
                </Button>
              </div>
            </li>
          ))}
        </motion.ul>
      )}
    </motion.div>
  )
}
