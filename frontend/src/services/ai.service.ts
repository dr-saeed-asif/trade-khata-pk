import { http } from '@/services/http'

export interface AiChatResponse {
  answer: string
  intent: string
  toolCalls: string[]
  citations: Array<{
    source: string
    title: string
    score: number
  }>
  resultBlocks: Array<{
    key: string
    title: string
    rows?: Array<Record<string, string | number>>
    metrics?: Record<string, string | number>
  }>
  usedProvider: string
  suggestions: string[]
}

export interface AiHistoryEntry {
  id: string
  userId: string
  role: string
  message: string
  intent: string
  toolCalls: string[]
  provider: string
  citationsCount: number
  latencyMs: number
  success: boolean
  errorMessage?: string
  createdAt: string
}

export interface AiAnalyticsResponse {
  days: number
  totalRequests: number
  successCount: number
  failureCount: number
  avgLatencyMs: number
  avgToolsPerRequest: number
  avgCitationsPerRequest: number
  providerUsage: Record<string, number>
  intentUsage: Record<string, number>
  generatedAt: string
}

export const aiService = {
  chat: async (message: string) => {
    const { data } = await http.post<AiChatResponse>('/ai/chat', { message })
    return data
  },
  history: async (limit = 20) => {
    const { data } = await http.get<AiHistoryEntry[]>('/ai/history', { params: { limit } })
    return data
  },
  analytics: async (days = 7) => {
    const { data } = await http.get<AiAnalyticsResponse>('/ai/analytics', { params: { days } })
    return data
  },
}
