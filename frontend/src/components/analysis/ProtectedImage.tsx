import { ImageOff } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { useProtectedImage } from '@/hooks/use-protected-image'
import { cn } from '@/lib/utils'

interface ProtectedImageProps {
  url: string | null | undefined
  alt: string
  className?: string
}

export function ProtectedImage({ url, alt, className }: ProtectedImageProps) {
  const { src, status } = useProtectedImage(url)

  if (status === 'loading' || status === 'idle') {
    return <Skeleton className={cn('size-full', className)} />
  }

  if (status === 'error' || !src) {
    return (
      <div
        className={cn('flex items-center justify-center bg-elevated text-subtle', className)}
        role="img"
        aria-label={`${alt} (unavailable)`}
      >
        <ImageOff className="size-5" aria-hidden="true" />
      </div>
    )
  }

  return <img src={src} alt={alt} className={cn('object-cover', className)} loading="lazy" />
}
