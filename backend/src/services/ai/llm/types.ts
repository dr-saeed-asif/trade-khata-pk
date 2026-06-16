export type LlmMessageRole = 'system' | 'user' | 'assistant' | 'tool'

export type LlmMessage = {
  role: LlmMessageRole
  content: string
  tool_call_id?: string
  tool_calls?: LlmToolCall[]
}

export type LlmToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export type LlmToolDefinition = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type LlmCompletionResult = {
  content: string | null
  toolCalls: LlmToolCall[]
  usage: TokenUsage
  model: string
  provider: string
  latencyMs: number
}

export type LlmToolLoopResult = {
  answer: string
  toolCallsExecuted: string[]
  usage: TokenUsage
  estimatedCostUsd: number
  llmLatencyMs: number
  provider: string
  model: string
}
