import { z } from 'zod'
import { readRagStore, writeRagStore } from './store'
import { scoreChunk, toChunks, tokenize } from './text'

const ragDocumentInputSchema = z.object({
  source: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(30).max(50000),
})

export const ragService = {
  ingestDocument: async (payload: unknown) => {
    const parsed = ragDocumentInputSchema.safeParse(payload)
    if (!parsed.success) {
      return {
        success: false as const,
        message: parsed.error.issues[0]?.message ?? 'Invalid rag document payload',
      }
    }

    const { source, title, content } = parsed.data
    const store = await readRagStore()
    const filtered = store.chunks.filter((chunk) => !(chunk.source === source && chunk.title === title))
    const newChunks = toChunks(source, title, content)
    const updated = [...filtered, ...newChunks]
    await writeRagStore({ chunks: updated })

    return {
      success: true as const,
      source,
      title,
      chunkCount: newChunks.length,
      totalChunks: updated.length,
    }
  },

  retrieve: async (query: string, take = 3) => {
    const store = await readRagStore()
    const queryTokens = tokenize(query)
    const ranked = store.chunks
      .map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(8, take)))

    return ranked.map((row) => ({
      source: row.chunk.source,
      title: row.chunk.title,
      content: row.chunk.content,
      score: Number(row.score.toFixed(3)),
    }))
  },

  listSources: async () => {
    const store = await readRagStore()
    const unique = new Map<string, { source: string; title: string; chunkCount: number }>()
    for (const chunk of store.chunks) {
      const key = `${chunk.source}::${chunk.title}`
      const existing = unique.get(key)
      if (existing) existing.chunkCount += 1
      else unique.set(key, { source: chunk.source, title: chunk.title, chunkCount: 1 })
    }
    return Array.from(unique.values()).sort((a, b) => a.source.localeCompare(b.source))
  },
}
