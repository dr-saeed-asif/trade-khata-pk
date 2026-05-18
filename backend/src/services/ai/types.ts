import type { ToolResult } from './tools'

export type AuthUser = {
  userId: string
  role: string
  permissions?: string[]
}

export type RagCitation = {
  source: string
  title: string
  content: string
  score: number
}

export type ResultBlock = {
  key: string
  title: string
  rows?: Array<Record<string, string | number>>
  metrics?: Record<string, string | number>
}

export type ChatResult = {
  answer: string
  intent: string
  toolCalls: string[]
  citations: Array<{ source: string; title: string; score: number }>
  resultBlocks: ResultBlock[]
  usedProvider: string
  suggestions: string[]
}

export type { ToolResult }
