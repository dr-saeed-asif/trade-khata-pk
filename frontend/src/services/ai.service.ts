import { http } from '@/services/http'

export interface AiChatResponse {
  answer: string
  conversationId: string
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

export interface AiConversationSummary {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  _count: { messages: number }
  lastMessage?: {
    content: string
    role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL'
    createdAt: string
  } | null
}

export interface AiConversationMessage {
  id: string
  conversationId: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL'
  content: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface AiHistoryEntry {
  id: string
  conversationId: string | null
  message: string
  response: string | null
  intent: string | null
  toolCalls: unknown
  provider: string
  totalLatencyMs: number
  success: boolean
  errorMessage: string | null
  createdAt: string
}

export interface AiAnalyticsResponse {
  days: number
  totalRequests: number
  successCount: number
  failureCount: number
  avgLatencyMs: number
  avgLlmLatencyMs?: number
  avgToolsPerRequest: number
  avgCitationsPerRequest: number
  totalTokens?: number
  estimatedTotalCostUsd?: number
  providerUsage: Record<string, number>
  intentUsage: Record<string, number>
  topTools?: Record<string, number>
  generatedAt: string
}

export const aiService = {
  chat: async (message: string, conversationId?: string) => {
    const { data } = await http.post<AiChatResponse>('/ai/chat', { message, conversationId })
    return data
  },
  history: async (limit = 20) => {
    const { data } = await http.get<AiHistoryEntry[]>('/ai/history', { params: { limit } })
    return data
  },
  listConversations: async (limit = 20) => {
    const { data } = await http.get<AiConversationSummary[]>('/ai/conversations', { params: { limit } })
    return data
  },
  createConversation: async () => {
    const { data } = await http.post<AiConversationSummary>('/ai/conversations')
    return data
  },
  getConversationMessages: async (conversationId: string, limit = 50) => {
    const { data } = await http.get<AiConversationMessage[]>(`/ai/conversations/${conversationId}/messages`, {
      params: { limit },
    })
    return data
  },
  analytics: async (days = 7) => {
    const { data } = await http.get<AiAnalyticsResponse>('/ai/analytics', { params: { days } })
    return data
  },
}
