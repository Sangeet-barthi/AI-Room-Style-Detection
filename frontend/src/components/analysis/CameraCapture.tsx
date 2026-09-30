import { Camera, CameraOff, Check, RotateCcw, Upload } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

type CameraState = 'idle' | 'requesting' | 'streaming' | 'captured' | 'denied' | 'unsupported'

interface CameraCaptureProps {
  onConfirm: (file: File) => void
  onFallbackToUpload: () => void
  disabled?: boolean
}

const DENIED_HELP = [
  'Chrome / Edge: click the camera icon in the address bar and choose "Always allow".',
  'Safari on iOS: Settings → Safari → Camera → Allow.',
  'Android Chrome: tap the lock icon → Permissions → Camera → Allow, then reload.',
]

export function CameraCapture({ onConfirm, onFallbackToUpload, disabled }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<CameraState>('idle')
  const [captured, setCaptured] = useState<{ url: string; file: File } | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      return
    }
    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Rear camera is the sensible default for photographing a room.
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('streaming')
    } catch (error) {
      const name = (error as DOMException)?.name
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unsupported')
    }
  }, [])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `room-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setCaptured({ url: URL.createObjectURL(file), file })
        setState('captured')
        stopStream()
      },
      'image/jpeg',
      0.92,
    )
  }, [stopStream])

  const retake = useCallback(() => {
    if (captured) URL.revokeObjectURL(captured.url)
    setCaptured(null)
    void start()
  }, [captured, start])

  if (state === 'captured' && captured) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-lg border border-line bg-surface"
      >
        <img src={captured.url} alt="The photo you just captured" className="w-full" />
        <div className="flex gap-3 border-t border-line p-4">
          <Button variant="outline" className="flex-1" onClick={retake} disabled={disabled}>
            <RotateCcw aria-hidden="true" />
            Retake
          </Button>
          <Button className="flex-1" onClick={() => onConfirm(captured.file)} disabled={disabled}>
            <Check aria-hidden="true" />
            Use photo
          </Button>
        </div>
      </motion.div>
    )
  }

  if (state === 'denied' || state === 'unsupported') {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-elevated">
          <CameraOff className="size-6 text-danger" aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-[17px] font-medium text-ink">
          {state === 'denied' ? 'Camera access is blocked' : 'Camera is not available here'}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {state === 'denied'
            ? 'Your browser is blocking camera access for this site. Re-enable it and try again, or upload a photo instead.'
            : 'This browser or device does not expose a camera to web pages. You can still upload a photo from your gallery.'}
        </p>

        {state === 'denied' && (
          <ul className="mx-auto mt-6 max-w-md space-y-2 rounded-md bg-elevated p-4 text-left text-[13px] text-muted">
            {DENIED_HELP.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Camera aria-hidden="true" />
            Use device camera app
          </Button>
          <Button onClick={onFallbackToUpload}>
            <Upload aria-hidden="true" />
            Upload instead
          </Button>
        </div>

        {/* Native capture: hands off to the OS camera app on mobile. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onConfirm(file)
          }}
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-charcoal">
      <div className="relative aspect-[4/3] w-full bg-charcoal">
        <video
          ref={videoRef}
          playsInline
          muted
          className="size-full object-cover"
          aria-label="Live camera preview"
        />
        {state !== 'streaming' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-canvas/10">
              <Camera className="size-6 text-canvas" aria-hidden="true" />
            </span>
            <p className="mt-5 text-[15px] font-medium text-canvas">
              {state === 'requesting' ? 'Waiting for camera permission…' : 'Photograph the room'}
            </p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-canvas/60">
              Stand in a doorway or corner so the frame includes the floor, one full wall and any
              window.
            </p>
            {state === 'idle' && (
              <Button variant="accent" className="mt-6" onClick={start} disabled={disabled}>
                <Camera aria-hidden="true" />
                Start camera
              </Button>
            )}
          </div>
        )}
      </div>

      {state === 'streaming' && (
        <div className="flex items-center justify-center gap-4 p-5">
          <button
            type="button"
            onClick={capture}
            disabled={disabled}
            aria-label="Capture photo"
            className="flex size-16 items-center justify-center rounded-full border-4 border-canvas/30 bg-canvas transition-transform duration-fast active:scale-95"
          >
            <span className="size-11 rounded-full bg-accent" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
