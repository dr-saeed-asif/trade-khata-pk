import { http } from '@/services/http'
import type { Alert, AlertSummary } from '@/types'

export const alertsService = {
  summary: async () => {
    const { data } = await http.get<AlertSummary>('/alerts/summary')
    return data
  },
  list: async () => {
    const { data } = await http.get<Alert[]>('/alerts')
    return data
  },
  refresh: async () => {
    const { data } = await http.post<{ created: number; resolved: number; items: number }>('/alerts/refresh')
    return data
  },
  markRead: async (id: string) => {
    const { data } = await http.post<Alert>(`/alerts/${id}/read`)
    return data
  },
  markAllRead: async () => {
    const { data } = await http.post('/alerts/mark-all-read')
    return data as { count: number }
  },
}
