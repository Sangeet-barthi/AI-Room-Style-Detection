import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Scan, Sparkles, Upload } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { analysisApi } from '@/api/analysis'
import { ApiError } from '@/api/client'
import {
  AnalysisTimeline,
  type AnalysisStage,
} from '@/components/analysis/AnalysisTimeline'
import { CameraCapture } from '@/components/analysis/CameraCapture'
import { ImageUploader } from '@/components/analysis/ImageUploader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { useCapabilities } from '@/hooks/use-capabilities'
import { fadeUp, stagger } from '@/lib/motion'
import { compressImage } from '@/lib/utils'

const TIPS = [
  'Stand in a doorway or corner so the frame includes the floor, one wall and any window.',
  'Shoot in daylight when you can — the lighting score reads what the camera sees.',
  'Skip filters and heavy edits; they change the palette the model samples.',
  'Photograph the room as it actually is. Tidying for the photo hides the space problems.',
]

export default function AnalyzePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: capabilities } = useCapabilities()

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [method, setMethod] = useState('upload')
  const [stage, setStage] = useState<AnalysisStage>('uploading')
  const [uploadPercent, setUploadPercent] = useState(0)
  const stageTimers = useRef<number[]>([])

  useEffect(() => {
    document.title = 'Analyze a room · RoomStyle AI'
    return () => stageTimers.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const maxMb = capabilities?.max_upload_mb ?? 10

  const mutation = useMutation({
    mutationFn: async (input: File) => {
      setStage('uploading')
      setUploadPercent(0)
      const optimised = await compressImage(input)

      return analysisApi.create(optimised, title.trim() || undefined, (percent) => {
        setUploadPercent(percent)
        // The upload completing is a real signal; after that the backend is
        // working through the pipeline, so the remaining stages advance on
        // conservative intervals rather than pretending to know progress.
        if (percent >= 100) {
          setStage('reading')
          stageTimers.current = [
            window.setTimeout(() => setStage('style'), 2500),
            window.setTimeout(() => setStage('detection'), 8000),
            window.setTimeout(() => setStage('health'), 14000),
            window.setTimeout(() => setStage('recommendations'), 18000),
          ]
        }
      })
    },
    onSuccess: (data) => {
      stageTimers.current.forEach((timer) => window.clearTimeout(timer))
      setStage('done')
      queryClient.invalidateQueries({ queryKey: ['analyses'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast({
        title: 'Analysis complete',
        description: `${data.room_type} · ${data.primary_style} · ${data.overall_score}/100`,
        tone: 'success',
      })
      navigate(`/analysis/${data.id}`, { replace: true })
    },
    onError: (error) => {
      stageTimers.current.forEach((timer) => window.clearTimeout(timer))
      const apiError = error instanceof ApiError ? error : null
      toast({
        title: apiError?.isQuotaError ? 'AI quota reached' : 'Analysis failed',
        description: apiError?.message ?? 'Please try again in a moment.',
        tone: 'error',
        duration: 8000,
      })
    },
  })

  if (mutation.isPending) {
    return (
      <div className="mx-auto max-w-2xl">
        <AnalysisTimeline stage={stage} uploadPercent={uploadPercent} />
      </div>
    )
  }

  return (
    <motion.div variants={stagger(0.05, 0.08)} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={fadeUp}>
        <PageHeader
          kicker="New analysis"
          title="Analyze a room"
          description="Upload a photo or take one now. The model reads only what is visible in the frame, so a wide, honest shot gives the most useful result."
        />
      </motion.div>

      {capabilities && !capabilities.vision_enabled && (
        <motion.div variants={fadeUp}>
          <ErrorState
            title="AI analysis is not configured"
            error={
              new ApiError(
                'No vision API key is configured on this deployment. Add GEMINI_API_KEY to the backend environment and restart the service to enable new analyses. Your existing analyses and reports remain available.',
                'ai_not_configured',
                503,
              )
            }
          />
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <Tabs value={method} onValueChange={setMethod}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="upload" className="flex-1 sm:flex-none">
                <Upload aria-hidden="true" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="camera" className="flex-1 sm:flex-none">
                <Camera aria-hidden="true" />
                Camera
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="upload" key="upload">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ImageUploader
                    file={file}
                    onSelect={setFile}
                    maxMb={maxMb}
                    disabled={mutation.isPending}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="camera" key="camera">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {file ? (
                    <ImageUploader
                      file={file}
                      onSelect={setFile}
                      maxMb={maxMb}
                      disabled={mutation.isPending}
                    />
                  ) : (
                    <CameraCapture
                      onConfirm={(captured) => {
                        setFile(captured)
                        setMethod('upload')
                      }}
                      onFallbackToUpload={() => setMethod('upload')}
                      disabled={mutation.isPending}
                    />
                  )}
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="title">Label this analysis (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Parents' bedroom, Flat 402"
              maxLength={160}
            />
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!file || capabilities?.vision_enabled === false}
            loading={mutation.isPending}
            onClick={() => file && mutation.mutate(file)}
          >
            <Sparkles aria-hidden="true" />
            Analyze room
          </Button>
        </div>

        <aside className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <Scan className="size-4 text-accent" aria-hidden="true" />
              <h2 className="text-[15px] font-medium text-ink">Getting a good photo</h2>
            </div>
            <ul className="mt-4 space-y-3">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-[15px] font-medium text-ink">What you will get</h2>
            <ul className="mt-4 space-y-2.5 text-[13px] text-muted">
              <li>Detected room type and design style, with the evidence behind it</li>
              <li>Furniture, materials, palette, wall and floor finish</li>
              <li>Lighting, ventilation and space scores out of 100</li>
              <li>Prioritised improvements and three costed makeover packages</li>
              <li>A downloadable PDF report</li>
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-[12px] leading-relaxed text-subtle">
              Images up to {maxMb} MB in JPEG, PNG or WEBP. Photos are stored privately against your
              account and are never shown to other users.
            </p>
          </Card>
        </aside>
      </motion.div>
    </motion.div>
  )
}
