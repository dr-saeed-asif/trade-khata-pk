import { env } from '../../../config/env'
import { estimateLlmCostUsd } from './cost'
import type {
  LlmCompletionResult,
  LlmMessage,
  LlmToolDefinition,
  LlmToolLoopResult,
  TokenUsage,
} from './types'

const EMPTY_USAGE: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

const SYSTEM_PROMPT =
  'You are an inventory operations copilot for a QR inventory management system. ' +
  'Use available tools to fetch real data before answering inventory questions. ' +
  'Never invent stock levels, SKUs, or reports. ' +
  'When the user refers to "these items", "previous results", or similar follow-ups, use conversation context and recent tool outputs. ' +
  'Keep answers concise with bullet points and actionable recommendations.'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const parseUsage = (usage?: {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}): TokenUsage => ({
  promptTokens: usage?.prompt_tokens ?? 0,
  completionTokens: usage?.completion_tokens ?? 0,
  totalTokens: usage?.total_tokens ?? 0,
})

const isRetryableStatus = (status: number) => status === 429 || status === 500 || status === 502 || status === 503

const resolveProviderLabel = () => {
  if (env.llmProvider === 'ollama') return 'ollama'
  if (env.llmProvider === 'qwen' || env.llmBaseUrl.includes('dashscope')) return 'qwen'
  if (env.llmProvider === 'openai') return 'openai'
  return env.llmProvider
}

/** OpenAI-compatible APIs expect assistant tool_calls without empty string content issues. */
const formatMessagesForApi = (messages: LlmMessage[]) =>
  messages.map((message) => {
    if (message.role === 'assistant' && message.tool_calls?.length) {
      return {
        role: message.role,
        content: message.content || null,
        tool_calls: message.tool_calls,
      }
    }
    if (message.role === 'tool') {
      return {
        role: message.role,
        tool_call_id: message.tool_call_id,
        content: message.content,
      }
    }
    return { role: message.role, content: message.content }
  })

const readErrorBody = async (response: Response) => {
  try {
    const text = await response.text()
    return text.slice(0, 500)
  } catch {
    return ''
  }
}

export const llmService = {
  isEnabled: () => {
    if (env.llmProvider === 'rule-based') return false
    if (env.llmProvider === 'ollama') return true
    return Boolean(env.llmApiKey)
  },

  getProviderLabel: resolveProviderLabel,

  buildSystemPrompt: (sessionSummary?: string | null) => {
    if (!sessionSummary) return SYSTEM_PROMPT
    return `${SYSTEM_PROMPT}\n\nConversation summary:\n${sessionSummary}`
  },

  complete: async (
    messages: LlmMessage[],
    tools?: LlmToolDefinition[],
  ): Promise<LlmCompletionResult | null> => {
    if (!llmService.isEnabled()) return null

    const baseUrl = env.llmBaseUrl.replace(/\/$/, '')
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= env.llmMaxRetries; attempt++) {
      const startedAt = Date.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), env.llmTimeoutMs)

      try {
        if (env.llmProvider === 'ollama') {
          const response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              model: env.llmModel,
              stream: false,
              messages: messages.map((m) => ({ role: m.role, content: m.content })),
              options: {
                temperature: env.llmTemperature,
                num_predict: env.llmMaxTokens,
              },
            }),
          })

          if (!response.ok) {
            if (isRetryableStatus(response.status) && attempt < env.llmMaxRetries) {
              await sleep(300 * (attempt + 1))
              continue
            }
            return null
          }

          const payload = (await response.json()) as { message?: { content?: string } }
          return {
            content: payload.message?.content ?? null,
            toolCalls: [],
            usage: EMPTY_USAGE,
            model: env.llmModel,
            provider: 'ollama',
            latencyMs: Date.now() - startedAt,
          }
        }

        if (!env.llmApiKey) return null

        const body: Record<string, unknown> = {
          model: env.llmModel,
          temperature: env.llmTemperature,
          max_tokens: env.llmMaxTokens,
          messages: formatMessagesForApi(messages),
        }
        if (tools?.length) {
          body.tools = tools
          body.tool_choice = 'auto'
          // Qwen Cloud defaults parallel_tool_calls to false; explicit for compatibility
          body.parallel_tool_calls = false
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.llmApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorBody = await readErrorBody(response)
          if (errorBody) {
            console.error(`[LLM] ${resolveProviderLabel()} request failed (${response.status}):`, errorBody)
          }
          if (isRetryableStatus(response.status) && attempt < env.llmMaxRetries) {
            await sleep(300 * (attempt + 1))
            continue
          }
          lastError = new Error(`LLM request failed with status ${response.status}`)
          return null
        }

        const payload = (await response.json()) as {
          choices?: Array<{
            message?: {
              content?: string | null
              tool_calls?: Array<{
                id: string
                type: 'function'
                function: { name: string; arguments: string }
              }>
            }
          }>
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
        }

        const choice = payload.choices?.[0]?.message
        return {
          content: choice?.content ?? null,
          toolCalls:
            choice?.tool_calls?.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: tc.function,
            })) ?? [],
          usage: parseUsage(payload.usage),
          model: env.llmModel,
          provider: resolveProviderLabel(),
          latencyMs: Date.now() - startedAt,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('LLM request failed')
        if (attempt < env.llmMaxRetries) {
          await sleep(300 * (attempt + 1))
          continue
        }
        return null
      } finally {
        clearTimeout(timeout)
      }
    }

    if (lastError) return null
    return null
  },

  runToolCallingLoop: async (
    userMessage: string,
    contextMessages: LlmMessage[],
    tools: LlmToolDefinition[],
    executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>,
    sessionSummary?: string | null,
  ): Promise<LlmToolLoopResult | null> => {
    if (!llmService.isEnabled()) return null

    const messages: LlmMessage[] = [
      { role: 'system', content: llmService.buildSystemPrompt(sessionSummary) },
      ...contextMessages,
      { role: 'user', content: userMessage },
    ]

    const toolCallsExecuted: string[] = []
    let totalUsage: TokenUsage = { ...EMPTY_USAGE }
    let totalLlmLatencyMs = 0
    const maxIterations = 5

    for (let i = 0; i < maxIterations; i++) {
      const result = await llmService.complete(messages, tools)
      if (!result) return null

      totalLlmLatencyMs += result.latencyMs
      totalUsage = {
        promptTokens: totalUsage.promptTokens + result.usage.promptTokens,
        completionTokens: totalUsage.completionTokens + result.usage.completionTokens,
        totalTokens: totalUsage.totalTokens + result.usage.totalTokens,
      }

      if (!result.toolCalls.length) {
        if (!result.content) return null
        return {
          answer: result.content,
          toolCallsExecuted,
          usage: totalUsage,
          estimatedCostUsd: estimateLlmCostUsd(result.model, totalUsage.promptTokens, totalUsage.completionTokens),
          llmLatencyMs: totalLlmLatencyMs,
          provider: result.provider,
          model: result.model,
        }
      }

      messages.push({
        role: 'assistant',
        content: result.content ?? '',
        tool_calls: result.toolCalls,
      })

      for (const toolCall of result.toolCalls) {
        const toolName = toolCall.function.name
        toolCallsExecuted.push(toolName)
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
        } catch {
          args = {}
        }

        let output: unknown
        try {
          output = await executeTool(toolName, args)
        } catch (error) {
          output = {
            error: error instanceof Error ? error.message : 'Tool execution failed',
          }
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(output),
        })
      }
    }

    return null
  },
}
