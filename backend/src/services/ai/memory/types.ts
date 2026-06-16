export type SessionContextState = {
  lastToolName?: string
  lastToolResult?: unknown
  activeItemIds?: string[]
  activeItemSkus?: string[]
  lastIntent?: string
  recentTopics?: string[]
}

export type MemoryContextForLlm = {
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  sessionSummary?: string | null
  contextState?: SessionContextState | null
}
