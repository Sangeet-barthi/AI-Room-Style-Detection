import { api } from '@/api/client'
import type {
  AnalysisDetail,
  Capabilities,
  DashboardStats,
  PaginatedAnalyses,
} from '@/types/api'

export interface AnalysisFilters {
  page?: number
  page_size?: number
  room_type?: string
  style?: string
  search?: string
}

export const analysisApi = {
  async create(
    file: File,
    title?: string,
    onProgress?: (percent: number) => void,
  ): Promise<AnalysisDetail> {
    const form = new FormData()
    form.append('image', file)
    if (title) form.append('title', title)

    const { data } = await api.post<AnalysisDetail>('/analyses', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
    })
    return data
  },

  async list(filters: AnalysisFilters = {}): Promise<PaginatedAnalyses> {
    const { data } = await api.get<PaginatedAnalyses>('/analyses', { params: filters })
    return data
  },

  async get(id: string): Promise<AnalysisDetail> {
    const { data } = await api.get<AnalysisDetail>(`/analyses/${id}`)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/analyses/${id}`)
  },

  async stats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>('/analyses/stats')
    return data
  },

  async capabilities(): Promise<Capabilities> {
    const { data } = await api.get<Capabilities>('/capabilities', { baseURL: '' })
    return data
  },
}
