export type AiLogRecord = {
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

export type LogStore = {
  logs: AiLogRecord[]
}
