import { ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn, formatBytes, readImageDimensions } from '@/lib/utils'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

interface ImageUploaderProps {
  file: File | null
  onSelect: (file: File | null) => void
  maxMb: number
  disabled?: boolean
}

export function ImageUploader({ file, onSelect, maxMb, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      setDimensions(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    readImageDimensions(file).then(setDimensions)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const accept = useCallback(
    (candidate: File | undefined) => {
      setError(null)
      if (!candidate) return

      if (!ACCEPTED.includes(candidate.type)) {
        setError('That file type is not supported. Use a JPEG, PNG or WEBP image.')
        return
      }
      if (candidate.size > maxMb * 1024 * 1024) {
        setError(`That image is ${formatBytes(candidate.size)}. The limit is ${maxMb} MB.`)
        return
      }
      onSelect(candidate)
    },
    [maxMb, onSelect],
  )

  if (file && preview) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-lg border border-line bg-surface"
      >
        <img
          src={preview}
          alt="Preview of the room photograph you selected"
          className="aspect-[4/3] w-full object-cover"
        />
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line p-4">
          <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px]">
            <div className="flex items-center gap-1.5">
              <dt className="text-subtle">Size</dt>
              <dd className="font-medium text-ink">{formatBytes(file.size)}</dd>
            </div>
            {dimensions && (
              <div className="flex items-center gap-1.5">
                <dt className="text-subtle">Dimensions</dt>
                <dd className="font-medium text-ink">
                  {dimensions.width} × {dimensions.height}
                </dd>
              </div>
            )}
          </dl>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              <RefreshCw aria-hidden="true" />
              Replace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onSelect(null)} disabled={disabled}>
              <Trash2 aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </motion.div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a room photograph by browsing or dropping a file"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled) accept(event.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center transition-all duration-base ease-premium',
          dragging ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:border-ink/25',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-elevated">
          {dragging ? (
            <ImageIcon className="size-6 text-accent" aria-hidden="true" />
          ) : (
            <Upload className="size-6 text-accent" aria-hidden="true" />
          )}
        </span>
        <p className="mt-5 text-[15px] font-medium text-ink">
          {dragging ? 'Drop the photo here' : 'Drag a room photo here'}
        </p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Or click to browse. JPEG, PNG or WEBP up to {maxMb} MB. One wide frame showing the floor,
          a wall and any window works best.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
