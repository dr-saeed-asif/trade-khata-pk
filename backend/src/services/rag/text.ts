import type { RagChunk } from './types'

const stopWords = new Set([
  'the', 'is', 'a', 'an', 'of', 'to', 'and', 'or', 'for', 'in', 'on', 'with', 'by', 'from', 'as',
  'at', 'be', 'this', 'that', 'it', 'are', 'was', 'were', 'can', 'could', 'should', 'how', 'what',
  'when', 'where', 'why', 'which', 'about',
])

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const tokenize = (value: string) =>
  normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !stopWords.has(token))

export const toChunks = (source: string, title: string, content: string) => {
  const words = content.split(/\s+/)
  const chunkSize = 140
  const overlap = 24
  const chunks: RagChunk[] = []

  for (let start = 0; start < words.length; start += chunkSize - overlap) {
    const end = Math.min(start + chunkSize, words.length)
    const body = words.slice(start, end).join(' ').trim()
    if (!body) continue
    chunks.push({
      id: `${source}-${Date.now()}-${start}`,
      source,
      title,
      content: body,
      tokens: tokenize(`${title} ${body}`),
    })
    if (end >= words.length) break
  }

  return chunks
}

export const scoreChunk = (queryTokens: string[], chunk: RagChunk) => {
  if (!queryTokens.length || !chunk.tokens.length) return 0
  const chunkSet = new Set(chunk.tokens)
  let overlap = 0
  for (const token of queryTokens) {
    if (chunkSet.has(token)) overlap += 1
  }
  return overlap / Math.sqrt(queryTokens.length * chunkSet.size)
}
