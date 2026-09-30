import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

import type { ApiErrorBody } from '@/types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const ACCESS_KEY = 'roomstyle.access'
const REFRESH_KEY = 'roomstyle.refresh'

export const tokenStore = {
  access: () => localStorage.getItem(ACCESS_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/** Normalised error surfaced to every screen. Never carries a stack trace. */
export class ApiError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }

  get isQuotaError() {
    return this.code === 'ai_quota_exceeded' || this.status === 429
  }

  get isAiError() {
    return this.code.startsWith('ai_')
  }
}

const FRIENDLY_FALLBACKS: Record<number, string> = {
  0: 'We could not reach the server. Check your connection and try again.',
  400: 'That request could not be processed.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have access to this resource.',
  404: 'We could not find what you were looking for.',
  409: 'That already exists.',
  413: 'That file is too large to upload.',
  415: 'That file type is not supported.',
  422: 'Some details need your attention.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  503: 'That service is temporarily unavailable.',
}

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 600_000,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh()
  if (!refresh) return null
  try {
    const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refresh },
    )
    tokenStore.set(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    tokenStore.clear()
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: ApiErrorBody }>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean }
    const status = error.response?.status ?? 0

    // Single-flight token refresh, then replay the original request once.
    if (status === 401 && original && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true
      refreshing = refreshing ?? refreshAccessToken()
      const token = await refreshing
      refreshing = null
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
      onUnauthorized?.()
    }

    const body = error.response?.data?.error
    throw new ApiError(
      body?.message ?? FRIENDLY_FALLBACKS[status] ?? 'Something went wrong. Please try again.',
      body?.code ?? (status === 0 ? 'network_error' : 'request_failed'),
      status,
      body?.details,
    )
  },
)

/** Downloads an authenticated binary response as a browser file download. */
export async function downloadFile(url: string, fileName: string) {
  const response = await api.get(url.replace(BASE_URL, ''), { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(response.data as Blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(blobUrl)
}

/** Fetches an ownership-protected image and returns an object URL. */
export async function fetchProtectedImage(url: string): Promise<string> {
  const response = await api.get(url.replace(BASE_URL, ''), { responseType: 'blob' })
  return URL.createObjectURL(response.data as Blob)
}
