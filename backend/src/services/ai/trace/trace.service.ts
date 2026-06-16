import { prisma } from '../../../config/prisma'
import { Prisma } from '@prisma/client'

export type AiTraceInput = {
  conversationId?: string
  userId: string
  role: string
  message: string
  response?: string
  intent?: string
  toolCalls?: string[]
  shortTermMemory?: Record<string, unknown>
  provider: string
  model?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  estimatedCostUsd?: number
  llmLatencyMs?: number
  totalLatencyMs: number
  citationsCount?: number
  success: boolean
  errorMessage?: string
}

const average = (values: number[]) => {
  if (!values.length) return 0
  return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2))
}

export const aiTraceService = {
  log: async (input: AiTraceInput) =>
    prisma.aiTrace.create({
      data: {
        conversationId: input.conversationId,
        userId: input.userId,
        role: input.role,
        message: input.message,
        response: input.response,
        intent: input.intent,
        toolCalls: input.toolCalls ?? [],
        shortTermMemory: (input.shortTermMemory ?? undefined) as Prisma.InputJsonValue | undefined,
        provider: input.provider,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.totalTokens,
        estimatedCostUsd: input.estimatedCostUsd,
        llmLatencyMs: input.llmLatencyMs,
        totalLatencyMs: input.totalLatencyMs,
        citationsCount: input.citationsCount ?? 0,
        success: input.success,
        errorMessage: input.errorMessage,
      },
    }),

  logToolCall: async (input: {
    conversationId?: string
    userId: string
    toolName: string
    input: Record<string, unknown>
    output: unknown
    success: boolean
    errorMessage?: string
    executionMs: number
  }) =>
    prisma.aiToolCall.create({
      data: {
        conversationId: input.conversationId,
        userId: input.userId,
        toolName: input.toolName,
        input: input.input as Prisma.InputJsonValue,
        output: input.output as Prisma.InputJsonValue | undefined,
        success: input.success,
        errorMessage: input.errorMessage,
        executionMs: input.executionMs,
      },
    }),

  getUserHistory: async (userId: string, limit = 20) =>
    prisma.aiTrace.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(100, limit)),
      select: {
        id: true,
        conversationId: true,
        message: true,
        response: true,
        intent: true,
        toolCalls: true,
        provider: true,
        totalLatencyMs: true,
        success: true,
        errorMessage: true,
        createdAt: true,
      },
    }),

  getAnalytics: async (days = 7) => {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const traces = await prisma.aiTrace.findMany({
      where: { createdAt: { gte: from } },
    })

    const successCount = traces.filter((t) => t.success).length
    const providerUsage = traces.reduce<Record<string, number>>((acc, row) => {
      acc[row.provider] = (acc[row.provider] ?? 0) + 1
      return acc
    }, {})
    const intentUsage = traces.reduce<Record<string, number>>((acc, row) => {
      const key = row.intent ?? 'unknown'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    const toolCalls = traces.flatMap((t) => (Array.isArray(t.toolCalls) ? (t.toolCalls as string[]) : []))

    return {
      days,
      totalRequests: traces.length,
      successCount,
      failureCount: traces.length - successCount,
      avgLatencyMs: average(traces.map((t) => t.totalLatencyMs)),
      avgLlmLatencyMs: average(traces.filter((t) => t.llmLatencyMs).map((t) => t.llmLatencyMs ?? 0)),
      avgToolsPerRequest: average(
        traces.map((t) => (Array.isArray(t.toolCalls) ? (t.toolCalls as string[]).length : 0)),
      ),
      avgCitationsPerRequest: average(traces.map((t) => t.citationsCount)),
      totalTokens: traces.reduce((sum, t) => sum + (t.totalTokens ?? 0), 0),
      estimatedTotalCostUsd: Number(
        traces.reduce((sum, t) => sum + (t.estimatedCostUsd ?? 0), 0).toFixed(4),
      ),
      providerUsage,
      intentUsage,
      topTools: toolCalls.reduce<Record<string, number>>((acc, name) => {
        acc[name] = (acc[name] ?? 0) + 1
        return acc
      }, {}),
      generatedAt: new Date().toISOString(),
    }
  },
}
