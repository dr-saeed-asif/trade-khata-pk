import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { RagChunk } from './types'

const ragDataDir = path.join(process.cwd(), 'data')
const ragIndexPath = path.join(ragDataDir, 'rag-index.json')

const ensureStore = async () => {
  await mkdir(ragDataDir, { recursive: true })
  try {
    await readFile(ragIndexPath, 'utf8')
  } catch {
    await writeFile(ragIndexPath, JSON.stringify({ chunks: [] }, null, 2), 'utf8')
  }
}

export const readRagStore = async (): Promise<{ chunks: RagChunk[] }> => {
  await ensureStore()
  const raw = await readFile(ragIndexPath, 'utf8')
  const parsed = JSON.parse(raw) as { chunks?: RagChunk[] }
  return { chunks: parsed.chunks ?? [] }
}

export const writeRagStore = async (store: { chunks: RagChunk[] }) => {
  await ensureStore()
  await writeFile(ragIndexPath, JSON.stringify(store, null, 2), 'utf8')
}
