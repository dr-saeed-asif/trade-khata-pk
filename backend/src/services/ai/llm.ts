import { env } from '../../config/env'
import type { RagCitation, ToolResult } from './types'
import { compactResultsForLlm } from './formatters'

export const createLlmAnswer = async (message: string, results: ToolResult[], citations: RagCitation[]) => {
  if (env.llmProvider === 'rule-based') return null

  const baseUrl = env.llmBaseUrl.replace(/\/$/, '')
  const systemPrompt =
    'You are an inventory assistant. Use only supplied tool outputs. Do not invent data. Keep response concise with clear bullet points and recommendation.'
  const userPrompt = `User question: ${message}\n\nTool outputs:\n${JSON.stringify(compactResultsForLlm(results))}\n\nRAG citations:\n${JSON.stringify(citations.slice(0, 3))}`
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
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          options: {
            temperature: env.llmTemperature,
            num_predict: env.llmMaxTokens,
          },
        }),
      })

      if (!response.ok) return null
      const payload = (await response.json()) as { message?: { content?: string } }
      return payload.message?.content ?? null
    }

    if (!env.llmApiKey) return null

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.llmApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.llmModel,
        temperature: env.llmTemperature,
        max_tokens: env.llmMaxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) return null
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return payload.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
