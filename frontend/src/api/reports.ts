import { api, downloadFile } from '@/api/client'
import type { ReportSummary } from '@/types/api'

export const reportApi = {
  async generate(analysisId: string): Promise<ReportSummary> {
    const { data } = await api.post<ReportSummary>(`/analyses/${analysisId}/report`)
    return data
  },

  async list(): Promise<ReportSummary[]> {
    const { data } = await api.get<ReportSummary[]>('/reports')
    return data
  },

  async download(report: ReportSummary): Promise<void> {
    await downloadFile(report.download_url, report.file_name)
  },
}
