import { z } from 'zod'
import { hasPermission, type Permission } from '../../config/permissions'
import { env } from '../../config/env'
import { categoryService } from '../category.service'
import { ApiError } from '../../utils/api-error'
import { ragService } from '../rag'
import { aiObservabilityService } from '../ai-observability'
import { runAiTools } from './tools'
import { buildResultBlocks, buildRuleBasedAnswer } from './formatters'
import { createLlmAnswer } from './llm'
import { llmService } from './llm/llm.service'
import { detectIntent, detectSmallTalkIntent, extractDays, isGreetingMessage, shouldUseLlmForAnswer, shouldUseRag } from './intents'
import { memoryManager } from './memory/memory-manager'
import { conversationService } from './memory/conversation.service'
import { aiTraceService } from './trace/trace.service'
import { getLlmToolDefinitions } from './tools/registry'
import { toolExecutor } from './tools/executor'
import type { AuthUser, ChatResult, RagCitation, ToolResult } from './types'
import type { CategoryRecord } from './tools/types'
import type { ToolExecutionRecord } from './tools/executor'

const chatInputSchema = z.object({
  message: z.string().min(2).max(2000),
  conversationId: z.string().uuid().optional(),
})

const hasRuntimePermission = (user: AuthUser, permission: Permission) => {
  const fromToken = user.permissions?.includes(permission) ?? false
  return fromToken || hasPermission(user.role, permission)
}

const toToolResults = (records: ToolExecutionRecord[]): ToolResult[] =>
  records.filter((r) => r.success).map((r) => ({ tool: r.toolName, data: r.output }))

const logTrace = async (input: Parameters<typeof aiTraceService.log>[0]) => {
  await aiTraceService.log(input)
  await aiObservabilityService.logChat({
    userId: input.userId,
    role: input.role,
    message: input.message,
    intent: input.intent ?? 'unknown',
    toolCalls: input.toolCalls ?? [],
    provider: input.provider,
    citationsCount: input.citationsCount ?? 0,
    latencyMs: input.totalLatencyMs,
    success: input.success,
    errorMessage: input.errorMessage,
  })
}

export const aiService = {
  chat: async (input: unknown, user?: AuthUser): Promise<ChatResult> => {
    if (!user) throw new ApiError(401, 'Unauthorized')

    const startedAt = Date.now()
    const parsed = chatInputSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid request payload')

    const { message, conversationId: inputConversationId } = parsed.data
    const conversation = await conversationService.getOrCreate(user.userId, inputConversationId)
    const conversationId = conversation.id

    await memoryManager.saveUserMessage(conversationId, message)
    const memoryContext = await memoryManager.getContextForLlm(conversationId)
    const followUpHint = memoryManager.buildFollowUpContextHint(memoryContext)

    const intent = detectIntent(message)
    let effectiveIntent = intent
    const days = extractDays(message)
    const results: ToolResult[] = []
    let usedProvider = 'rule-based'
    let citations: RagCitation[] = []
    const text = message.toLowerCase()
    let cachedCategories: CategoryRecord[] | null = null
    let llmLatencyMs = 0
    let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    let estimatedCostUsd = 0
  let answer = ''

    const ensureCategories = async () => {
      if (!cachedCategories) {
        cachedCategories = (await categoryService.list({ limit: '500' })).data
      }
      return cachedCategories
    }

    const can = (permission: Permission) => hasRuntimePermission(user, permission)

    try {
      if (isGreetingMessage(text)) {
        answer =
          'Hi! I am your inventory copilot. Ask about low stock, expiring items, sales summaries, reorder suggestions, or follow up on previous results in this chat.'
        await memoryManager.saveAssistantMessage(conversationId, answer, { intent: 'greeting' })
        await memoryManager.touchConversation(conversationId, message)
        await logTrace({
          conversationId,
          userId: user.userId,
          role: user.role,
          message,
          response: answer,
          intent: 'greeting',
          toolCalls: [],
          shortTermMemory: { messageCount: memoryContext.recentMessages.length },
          provider: 'rule-based',
          totalLatencyMs: Date.now() - startedAt,
          success: true,
        })
        return {
          answer,
          conversationId,
          intent: 'greeting',
          toolCalls: [],
          citations: [],
          resultBlocks: [],
          usedProvider: 'rule-based',
          suggestions: ['Show low stock items', 'What items are expiring soon?', 'Get inventory summary'],
        }
      }

      const smallTalkIntent = detectSmallTalkIntent(text)
      if (smallTalkIntent) {
        const smallTalkAnswers: Record<string, string> = {
          thanks: "You're welcome! Ask any inventory or stock query anytime.",
          acknowledgement: 'Great. I am ready for your next inventory query.',
          help: 'I can answer inventory questions using live data — stock levels, low stock, expiring items, sales/purchase summaries, and reorder suggestions. I remember context within this conversation.',
        }
        answer = smallTalkAnswers[smallTalkIntent] ?? 'I am here to help with your inventory queries.'
        await memoryManager.saveAssistantMessage(conversationId, answer, { intent: smallTalkIntent })
        await memoryManager.touchConversation(conversationId)
        await logTrace({
          conversationId,
          userId: user.userId,
          role: user.role,
          message,
          response: answer,
          intent: smallTalkIntent,
          toolCalls: [],
          provider: 'rule-based',
          totalLatencyMs: Date.now() - startedAt,
          success: true,
        })
        return {
          answer,
          conversationId,
          intent: smallTalkIntent,
          toolCalls: [],
          citations: [],
          resultBlocks: [],
          usedProvider: 'rule-based',
          suggestions: ['Show low stock items', 'Get inventory summary', 'Summarize these results'],
        }
      }

      if (shouldUseRag(text)) citations = await ragService.retrieve(message, 3)

      const toolDefinitions = getLlmToolDefinitions(can)
      const enrichedMessage = followUpHint ? `${message}\n\n[Context]\n${followUpHint}` : message
      const toolExecutionRecords: ToolExecutionRecord[] = []

      if (llmService.isEnabled() && toolDefinitions.length > 0) {
        const loopResult = await llmService.runToolCallingLoop(
          enrichedMessage,
          memoryContext.recentMessages.slice(0, -1),
          toolDefinitions,
          async (toolName, args) => {
            const record = await toolExecutor.execute(toolName, args, {
              userId: user.userId,
              conversationId,
              can,
            })
            toolExecutionRecords.push(record)
            await aiTraceService.logToolCall({
              conversationId,
              userId: user.userId,
              toolName: record.toolName,
              input: record.input,
              output: record.output,
              success: record.success,
              errorMessage: record.errorMessage,
              executionMs: record.executionMs,
            })
            return record.success ? record.output : { error: record.errorMessage }
          },
          memoryContext.sessionSummary,
        )

        if (loopResult) {
          answer = loopResult.answer
          usedProvider = loopResult.provider
          llmLatencyMs = loopResult.llmLatencyMs
          tokenUsage = loopResult.usage
          estimatedCostUsd = loopResult.estimatedCostUsd
          results.push(...toToolResults(toolExecutionRecords))
          effectiveIntent = toolExecutionRecords[0]?.toolName ?? intent
        }
      }

      if (!answer) {
        results.push(
          ...(await runAiTools({
            message,
            text,
            intent,
            days,
            can: (permission) => can(permission as Permission),
            getCategories: ensureCategories,
          })),
        )

        if (intent === 'help' && results.length > 0) effectiveIntent = 'custom-query'

        const llmAnswer = shouldUseLlmForAnswer(text, effectiveIntent, results)
          ? await createLlmAnswer(enrichedMessage, results, citations)
          : null
        answer = llmAnswer ?? buildRuleBasedAnswer(message, results, citations)
        usedProvider = llmAnswer ? env.llmProvider : 'rule-based'
      }

      const resultBlocks = buildResultBlocks(results)
      const toolCallNames = results.map((entry) => entry.tool)

      const lastSuccessfulTool = toolExecutionRecords.find((r) => r.success) ?? null
      await memoryManager.saveAssistantMessage(conversationId, answer, {
        intent: effectiveIntent,
        toolCalls: toolCallNames,
        provider: usedProvider,
        resultBlocks,
        citations: citations.map((c) => ({ source: c.source, title: c.title, score: c.score })),
      })
      await memoryManager.updateSessionAfterTurn(conversationId, {
        toolName: lastSuccessfulTool?.toolName ?? toolCallNames[0],
        toolOutput: lastSuccessfulTool?.output ?? results[0]?.data,
        intent: effectiveIntent,
      })
      await memoryManager.touchConversation(conversationId, message)

      await logTrace({
        conversationId,
        userId: user.userId,
        role: user.role,
        message,
        response: answer,
        intent: effectiveIntent,
        toolCalls: toolCallNames,
        shortTermMemory: {
          recentMessageCount: memoryContext.recentMessages.length,
          hasSessionSummary: Boolean(memoryContext.sessionSummary),
          contextState: memoryContext.contextState,
        },
        provider: usedProvider,
        model: llmService.isEnabled() ? env.llmModel : undefined,
        promptTokens: tokenUsage.promptTokens || undefined,
        completionTokens: tokenUsage.completionTokens || undefined,
        totalTokens: tokenUsage.totalTokens || undefined,
        estimatedCostUsd: estimatedCostUsd || undefined,
        llmLatencyMs: llmLatencyMs || undefined,
        totalLatencyMs: Date.now() - startedAt,
        citationsCount: citations.length,
        success: true,
      })

      return {
        answer,
        conversationId,
        intent: effectiveIntent,
        toolCalls: toolCallNames,
        citations: citations.map((entry) => ({
          source: entry.source,
          title: entry.title,
          score: entry.score,
        })),
        resultBlocks,
        usedProvider,
        suggestions: [
          'Summarize these results',
          'Show only critical ones',
          'Create a reorder report from that',
        ],
      }
    } catch (error) {
      await logTrace({
        conversationId,
        userId: user.userId,
        role: user.role,
        message,
        intent: effectiveIntent,
        toolCalls: results.map((entry) => entry.tool),
        provider: usedProvider,
        totalLatencyMs: Date.now() - startedAt,
        citationsCount: citations.length,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  },

  analytics: async (days: number) => aiTraceService.getAnalytics(days),
  history: async (userId: string, limit = 20) => aiTraceService.getUserHistory(userId, limit),
  listConversations: async (userId: string, limit = 20) => conversationService.listForUser(userId, limit),
  createConversation: async (userId: string) => conversationService.create(userId),
  getConversationMessages: async (userId: string, conversationId: string, limit = 50) =>
    conversationService.getMessages(userId, conversationId, limit),
}
