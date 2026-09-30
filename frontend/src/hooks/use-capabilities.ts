import { useQuery } from '@tanstack/react-query'

import { analysisApi } from '@/api/analysis'

export function useCapabilities() {
  return useQuery({
    queryKey: ['capabilities'],
    queryFn: analysisApi.capabilities,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
