import { AiMessageRole, Prisma } from '@prisma/client'
import { prisma } from '../../../config/prisma'
import { env } from '../../../config/env'
import { llmService } from '../llm/llm.service'
import { conversationService } from './conversation.service'
import type { MemoryContextForLlm, SessionContextState } from './types'

const mapRoleForLlm = (role: AiMessageRole): 'user' | 'assistant' | null => {
  if (role === AiMessageRole.USER) return 'user'
  if (role === AiMessageRole.ASSISTANT) return 'assistant'
  return null
}

const extractContextFromToolResult = (toolName: string, output: unknown): Partial<SessionContextState> => {
  const state: Partial<SessionContextState> = {
    lastToolName: toolName,
    lastToolResult: output,
  }

  if (!output || typeof output !== 'object') return state

  const data = output as Record<string, unknown>
  const items = (data.items ?? data.suggestions) as Array<Record<string, unknown>> | undefined
  if (Array.isArray(items) && items.length) {
    state.activeItemIds = items.map((i) => String(i.id)).filter(Boolean).slice(0, 20)
    state.activeItemSkus = items.map((i) => String(i.sku)).filter(Boolean).slice(0, 20)
  }

  return state
}

export const memoryManager = {
  saveUserMessage: async (conversationId: string, content: string, metadata?: Record<string, unknown>) =>
    prisma.aiMessage.create({
      data: {
        conversationId,
        role: AiMessageRole.USER,
        content,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    }),

  saveAssistantMessage: async (
    conversationId: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) =>
    prisma.aiMessage.create({
      data: {
        conversationId,
        role: AiMessageRole.ASSISTANT,
        content,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    }),

  getContextForLlm: async (conversationId: string): Promise<MemoryContextForLlm> => {
    const [messages, sessionMemory] = await Promise.all([
      prisma.aiMessage.findMany({
        where: {
          conversationId,
          role: { in: [AiMessageRole.USER, AiMessageRole.ASSISTANT] },
        },
        orderBy: { createdAt: 'desc' },
        take: env.aiMaxContextMessages,
      }),
      prisma.aiSessionMemory.findUnique({ where: { conversationId } }),
    ])

    const recentMessages = messages
      .reverse()
      .map((m) => {
        const role = mapRoleForLlm(m.role)
        if (!role) return null
        return { role, content: m.content }
      })
      .filter((m): m is { role: 'user' | 'assistant'; content: string } => m !== null)

    return {
      recentMessages,
      sessionSummary: sessionMemory?.summary ?? null,
      contextState: (sessionMemory?.contextState as SessionContextState | null) ?? null,
    }
  },

  updateSessionAfterTurn: async (
    conversationId: string,
    updates: {
      toolName?: string
      toolOutput?: unknown
      intent?: string
    },
  ) => {
    const existing = await prisma.aiSessionMemory.findUnique({ where: { conversationId } })
    const prevState = (existing?.contextState as SessionContextState | null) ?? {}
    const toolContext = updates.toolName && updates.toolOutput
      ? extractContextFromToolResult(updates.toolName, updates.toolOutput)
      : {}

    const contextState = {
      ...prevState,
      ...toolContext,
      lastIntent: updates.intent ?? prevState.lastIntent,
      recentTopics: [
        updates.intent ?? updates.toolName ?? 'general',
        ...(prevState.recentTopics ?? []),
      ].slice(0, 5),
    } satisfies SessionContextState

    const messageCount = await prisma.aiMessage.count({ where: { conversationId } })

    await prisma.aiSessionMemory.upsert({
      where: { conversationId },
      create: {
        conversationId,
        contextState: contextState as Prisma.InputJsonValue,
        messageCount,
      },
      update: {
        contextState: contextState as Prisma.InputJsonValue,
        messageCount,
        updatedAt: new Date(),
      },
    })

    if (messageCount >= env.aiSummaryThreshold && llmService.isEnabled()) {
      await memoryManager.maybeSummarizeConversation(conversationId)
    }
  },

  maybeSummarizeConversation: async (conversationId: string) => {
    const sessionMemory = await prisma.aiSessionMemory.findUnique({ where: { conversationId } })
    if (sessionMemory?.summary && (sessionMemory.messageCount ?? 0) < env.aiSummaryThreshold * 2) {
      return
    }

    const olderMessages = await prisma.aiMessage.findMany({
      where: {
        conversationId,
        role: { in: [AiMessageRole.USER, AiMessageRole.ASSISTANT] },
      },
      orderBy: { createdAt: 'asc' },
      take: env.aiSummaryThreshold,
    })

    if (olderMessages.length < env.aiSummaryThreshold) return

    const transcript = olderMessages
      .map((m) => `${m.role}: ${m.content.slice(0, 300)}`)
      .join('\n')

    const result = await llmService.complete([
      {
        role: 'system',
        content: 'Summarize this inventory assistant conversation in 3-5 bullet points. Focus on user goals, items discussed, and pending follow-ups.',
      },
      { role: 'user', content: transcript },
    ])

    if (!result?.content) return

    await prisma.aiSessionMemory.update({
      where: { conversationId },
      data: { summary: result.content, updatedAt: new Date() },
    })
  },

  buildFollowUpContextHint: (context: MemoryContextForLlm) => {
    const parts: string[] = []
    if (context.sessionSummary) {
      parts.push(`Session summary: ${context.sessionSummary}`)
    }
    if (context.contextState?.lastToolName) {
      parts.push(`Last tool used: ${context.contextState.lastToolName}`)
    }
    if (context.contextState?.activeItemSkus?.length) {
      parts.push(`Active items (SKUs): ${context.contextState.activeItemSkus.join(', ')}`)
    }
    if (context.contextState?.lastToolResult) {
      parts.push(`Last tool result snapshot: ${JSON.stringify(context.contextState.lastToolResult).slice(0, 1500)}`)
    }
    return parts.length ? parts.join('\n') : null
  },

  touchConversation: conversationService.touch,
}
