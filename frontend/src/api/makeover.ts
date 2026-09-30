import { api } from '@/api/client'
import type { DesignStyle, Makeover } from '@/types/api'

export const makeoverApi = {
  async create(analysisId: string, targetStyle: DesignStyle, force = false): Promise<Makeover> {
    const { data } = await api.post<Makeover>(`/analyses/${analysisId}/makeover`, {
      target_style: targetStyle,
      force,
    })
    return data
  },

  async list(analysisId: string): Promise<Makeover[]> {
    const { data } = await api.get<Makeover[]>(`/analyses/${analysisId}/makeover`)
    return data
  },
}
