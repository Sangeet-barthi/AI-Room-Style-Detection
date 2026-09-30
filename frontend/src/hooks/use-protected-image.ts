import { useEffect, useState } from 'react'

import { fetchProtectedImage } from '@/api/client'

/**
 * Analysis images are ownership-protected, so they need the Authorization
 * header — a plain <img src> cannot send one. This fetches the blob and
 * revokes the object URL on unmount.
 */
export function useProtectedImage(url: string | null | undefined) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    if (!url) {
      setObjectUrl(null)
      setStatus('idle')
      return
    }

    let active = true
    let created: string | null = null
    setStatus('loading')

    fetchProtectedImage(url)
      .then((result) => {
        if (!active) {
          URL.revokeObjectURL(result)
          return
        }
        created = result
        setObjectUrl(result)
        setStatus('ready')
      })
      .catch(() => active && setStatus('error'))

    return () => {
      active = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [url])

  return { src: objectUrl, status }
}
