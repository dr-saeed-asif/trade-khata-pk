import type { ToolResult } from './types'

export const detectIntent = (message: string) => {
  const text = message.toLowerCase()
  if (text.includes('profit') || text.includes('loss') || text.includes('margin')) return 'profit-loss'
  if (text.includes('mover') || text.includes('fast moving') || text.includes('slow moving')) return 'movers'
  if (text.includes('trend') || text.includes('movement')) return 'movement-trend'
  if (text.includes('low stock') || text.includes('reorder')) return 'low-stock'
  if (text.includes('recent')) return 'recent'
  if (text.includes('item') || text.includes('sku') || text.includes('search')) return 'search-items'
  return 'help'
}

export const extractDays = (message: string) => {
  const match = message.match(/(\d{1,3})\s*day/i)
  const parsed = Number(match?.[1] ?? 30)
  if (!Number.isFinite(parsed)) return 30
  return Math.max(1, Math.min(365, Math.floor(parsed)))
}

const hasAnyWord = (text: string, words: string[]) => words.some((word) => text.includes(word))

export const isGreetingMessage = (text: string) => {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return false
  return /^(hi|hello|hey|salam|assalam o alaikum|aoa|good morning|good evening|good afternoon)[!. ]*$/.test(normalized)
}

export const detectSmallTalkIntent = (text: string) => {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return null

  if (/^(thanks|thank you|thx|jazakallah|jazak allah)[!. ]*$/.test(normalized)) return 'thanks'
  if (/^(ok|okay|k|done|great|nice|good)[!. ]*$/.test(normalized)) return 'acknowledgement'
  if (/^(who are you|what are you|what can you do|help me|help)[?.! ]*$/.test(normalized)) return 'help'

  return null
}

export const shouldUseRag = (text: string) =>
  hasAnyWord(text, ['how', 'why', 'explain', 'policy', 'sop', 'guide', 'documentation', 'process'])

export const shouldUseLlmForAnswer = (text: string, intent: string, results: ToolResult[]) => {
  const dataHeavyTools = new Set(['inventory-details', 'users-list', 'search-items', 'low-stock', 'recent'])
  const hasDataHeavyTool = results.some((result) => dataHeavyTools.has(result.tool))
  if (hasDataHeavyTool) return false
  if (results.some((result) => result.tool === 'category-list')) return true
  if (intent === 'help') return true
  if (hasAnyWord(text, ['explain', 'summary', 'summarize', 'insight', 'analysis', 'recommend'])) return true
  return false
}
