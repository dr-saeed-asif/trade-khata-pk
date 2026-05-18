import { z } from 'zod'
import { hasPermission } from '../../config/permissions'
import { env } from '../../config/env'
import { categoryService } from '../category.service'
import { ApiError } from '../../utils/api-error'
import { ragService } from '../rag'
import { aiObservabilityService } from '../ai-observability'
import { runAiTools } from './tools'
import { buildResultBlocks, buildRuleBasedAnswer } from './formatters'
import { createLlmAnswer } from './llm'
import { detectIntent, detectSmallTalkIntent, extractDays, isGreetingMessage, shouldUseLlmForAnswer, shouldUseRag } from './intents'
import type { AuthUser, ChatResult, RagCitation, ToolResult } from './types'
import type { CategoryRecord } from './tools/types'

const chatInputSchema = z.object({
  message: z.string().min(2).max(2000),
})

const hasRuntimePermission = (user: AuthUser, permission: Parameters<typeof hasPermission>[1]) => {
  const fromToken = user.permissions?.includes(permission) ?? false
  return fromToken || hasPermission(user.role, permission)
}

export const aiService = {
  chat: async (input: unknown, user?: AuthUser): Promise<ChatResult> => {
    if (!user) throw new ApiError(401, 'Unauthorized')

    const startedAt = Date.now()
    const parsed = chatInputSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Invalid request payload')

    const { message } = parsed.data
    const intent = detectIntent(message)
    let effectiveIntent = intent
    const days = extractDays(message)
    const results: ToolResult[] = []
    let usedProvider = 'rule-based'
    let citations: RagCitation[] = []
    const text = message.toLowerCase()
    let cachedCategories: CategoryRecord[] | null = null
    const ensureCategories = async () => {
      if (!cachedCategories) {
        cachedCategories = (await categoryService.list({ limit: '500' })).data
      }
      return cachedCategories
    }

    try {
      if (isGreetingMessage(text)) {
        const answer = 'Hi! I can help with inventory insights. Ask me things like total stock quantity, category names, low stock items, users list, or inventory details.'
        await aiObservabilityService.logChat({
          userId: user.userId,
          role: user.role,
          message,
          intent: 'greeting',
          toolCalls: [],
          provider: 'rule-based',
          citationsCount: 0,
          latencyMs: Date.now() - startedAt,
          success: true,
        })
        return {
          answer,
          intent: 'greeting',
          toolCalls: [],
          citations: [],
          resultBlocks: [],
          usedProvider: 'rule-based',
          suggestions: [
            'Get total stock quantity',
            'Show low stock items',
            'List category names',
          ],
        }
      }

      const smallTalkIntent = detectSmallTalkIntent(text)
      if (smallTalkIntent) {
        const smallTalkAnswers: Record<string, string> = {
          thanks: "You're welcome! Ask any inventory or stock query anytime.",
          acknowledgement: 'Great. I am ready for your next inventory query.',
          help: 'I can answer inventory questions using your project data, like stock totals, low stock items, category names, user list, and report insights.',
        }
        const answer = smallTalkAnswers[smallTalkIntent] ?? 'I am here to help with your inventory queries.'

        await aiObservabilityService.logChat({
          userId: user.userId,
          role: user.role,
          message,
          intent: smallTalkIntent,
          toolCalls: [],
          provider: 'rule-based',
          citationsCount: 0,
          latencyMs: Date.now() - startedAt,
          success: true,
        })

        return {
          answer,
          intent: smallTalkIntent,
          toolCalls: [],
          citations: [],
          resultBlocks: [],
          usedProvider: 'rule-based',
          suggestions: [
            'Get total stock quantity',
            'Show low stock items',
            'List category names',
          ],
        }
      }

      if (shouldUseRag(text)) citations = await ragService.retrieve(message, 3)

      results.push(
        ...(await runAiTools({
          message,
          text,
          intent,
          days,
          can: (permission) => hasRuntimePermission(user, permission as Parameters<typeof hasPermission>[1]),
          getCategories: ensureCategories,
        })),
      )

      if (intent === 'help' && results.length > 0) effectiveIntent = 'custom-query'

      const llmAnswer = shouldUseLlmForAnswer(text, effectiveIntent, results)
        ? await createLlmAnswer(message, results, citations)
        : null
      const answer = llmAnswer ?? buildRuleBasedAnswer(message, results, citations)
      const resultBlocks = buildResultBlocks(results)
      usedProvider = llmAnswer ? env.llmProvider : 'rule-based'

      await aiObservabilityService.logChat({
        userId: user.userId,
        role: user.role,
        message,
        intent: effectiveIntent,
        toolCalls: results.map((entry) => entry.tool),
        provider: usedProvider,
        citationsCount: citations.length,
        latencyMs: Date.now() - startedAt,
        success: true,
      })

      return {
        answer,
        intent: effectiveIntent,
        toolCalls: results.map((entry) => entry.tool),
        citations: citations.map((entry) => ({
          source: entry.source,
          title: entry.title,
          score: entry.score,
        })),
        resultBlocks,
        usedProvider,
        suggestions: [
          'Show low stock items',
          'Profit loss for last 30 days',
          'Top fast and slow movers for 90 days',
        ],
      }
    } catch (error) {
      await aiObservabilityService.logChat({
        userId: user.userId,
        role: user.role,
        message,
        intent: effectiveIntent,
        toolCalls: results.map((entry) => entry.tool),
        provider: usedProvider,
        citationsCount: citations.length,
        latencyMs: Date.now() - startedAt,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  },
  analytics: async (days: number) => aiObservabilityService.getAnalytics(days),
  history: async (userId: string, limit = 20) => aiObservabilityService.getUserHistory(userId, limit),
}
