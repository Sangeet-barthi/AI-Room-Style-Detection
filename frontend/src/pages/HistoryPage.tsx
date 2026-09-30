import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, Scan, Search, Trash2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { analysisApi } from '@/api/analysis'
import { ApiError } from '@/api/client'
import { reportApi } from '@/api/reports'
import { ProtectedImage } from '@/components/analysis/ProtectedImage'
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
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useCapabilities } from '@/hooks/use-capabilities'
import { fadeUp, stagger } from '@/lib/motion'
import { formatDate, scoreTone } from '@/lib/utils'

const ALL = '__all__'
const PAGE_SIZE = 9

export default function HistoryPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: capabilities } = useCapabilities()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [style, setStyle] = useState(ALL)
  const [roomType, setRoomType] = useState(ALL)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'History · RoomStyle AI'
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  const filters = {
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch || undefined,
    style: style === ALL ? undefined : style,
    room_type: roomType === ALL ? undefined : roomType,
  }

  const listQuery = useQuery({
    queryKey: ['analyses', filters],
    queryFn: () => analysisApi.list(filters),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => analysisApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast({ title: 'Analysis deleted', tone: 'info' })
      setPendingDelete(null)
    },
    onError: (error) =>
      toast({
        title: 'Could not delete',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        tone: 'error',
      }),
  })

  const reportMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const report = await reportApi.generate(analysisId)
      await reportApi.download(report)
      return report
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast({ title: 'Report downloaded', description: report.file_name, tone: 'success' })
    },
    onError: (error) =>
      toast({
        title: 'Report failed',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        tone: 'error',
      }),
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const hasFilters = Boolean(debouncedSearch) || style !== ALL || roomType !== ALL

  const clearFilters = () => {
    setSearch('')
    setStyle(ALL)
    setRoomType(ALL)
    setPage(1)
  }

  return (
    <motion.div variants={stagger(0.04, 0.07)} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={fadeUp}>
        <PageHeader
          kicker="Your library"
          title="Analysis history"
          description="Every room you have analysed, with its score, style and report. Opening a saved analysis never re-runs the model."
          actions={
            <Button asChild>
              <Link to="/analyze">
                <Scan aria-hidden="true" />
                New analysis
              </Link>
            </Button>
          }
        />
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by label…"
            aria-label="Search your analyses"
            className="pl-10"
          />
        </div>

        <Select
          value={style}
          onValueChange={(value) => {
            setStyle(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-44" aria-label="Filter by style">
            <SelectValue placeholder="All styles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All styles</SelectItem>
            {(capabilities?.supported_styles ?? []).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={roomType}
          onValueChange={(value) => {
            setRoomType(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-48" aria-label="Filter by room type">
            <SelectValue placeholder="All room types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All room types</SelectItem>
            {(capabilities?.supported_room_types ?? []).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X aria-hidden="true" />
            Clear
          </Button>
        )}
      </motion.div>

      {listQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Scan}
          title={hasFilters ? 'No matching analyses' : 'Your history is empty'}
          description={
            hasFilters
              ? 'Nothing matches these filters. Try widening the search.'
              : 'Once you analyse a room it will appear here with its score, recommendations and report.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button asChild>
                <Link to="/analyze">
                  <Scan aria-hidden="true" />
                  Analyze a room
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id} className="flex flex-col overflow-hidden p-0">
                <Link to={`/analysis/${item.id}`} className="group block">
                  <ProtectedImage
                    url={item.thumbnail_url}
                    alt={`${item.room_type} analysed as ${item.primary_style}`}
                    className="aspect-[4/3] w-full transition-transform duration-slow ease-premium group-hover:scale-[1.02]"
                  />
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink">
                        {item.title || item.room_type}
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted">
                        {item.room_type} · {item.primary_style}
                      </p>
                    </div>
                    <Badge variant={scoreTone(item.overall_score)}>{item.overall_score}</Badge>
                  </div>

                  <p className="mt-3 text-[12px] text-subtle">{formatDate(item.created_at)}</p>

                  <div className="mt-auto flex items-center gap-2 pt-5">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/analysis/${item.id}`}>
                        <Eye aria-hidden="true" />
                        View
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Download report for ${item.room_type}`}
                      loading={reportMutation.isPending && reportMutation.variables === item.id}
                      onClick={() => reportMutation.mutate(item.id)}
                    >
                      <Download aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete analysis of ${item.room_type}`}
                      onClick={() => setPendingDelete(item.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>

          {total > PAGE_SIZE && (
            <motion.nav
              variants={fadeUp}
              aria-label="Pagination"
              className="flex items-center justify-between border-t border-line pt-6"
            >
              <p className="text-[13px] text-muted">
                Page {page} of {Math.ceil(total / PAGE_SIZE)} · {total} analyses
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!listQuery.data?.has_more}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </motion.nav>
          )}
        </>
      )}

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this analysis?</DialogTitle>
            <DialogDescription>
              The photograph, scores, recommendations and any generated reports will be permanently
              removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
