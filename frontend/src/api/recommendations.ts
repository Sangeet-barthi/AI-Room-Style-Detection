import { api } from '@/api/client'
import type { RecommendationsResponse } from '@/types/api'

export const recommendationApi = {
  async forAnalysis(analysisId: string): Promise<RecommendationsResponse> {
    const { data } = await api.get<RecommendationsResponse>(
      `/analyses/${analysisId}/recommendations`,
    )
    return data
  },
}
