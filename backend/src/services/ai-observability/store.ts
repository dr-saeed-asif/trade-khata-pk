import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { LogStore } from './types'

const logsDir = path.join(process.cwd(), 'data')
const logsPath = path.join(logsDir, 'ai-observability.json')

const ensureStore = async () => {
  await mkdir(logsDir, { recursive: true })
  try {
    await readFile(logsPath, 'utf8')
  } catch {
    await writeFile(logsPath, JSON.stringify({ logs: [] }, null, 2), 'utf8')
  }
}

export const readLogStore = async (): Promise<LogStore> => {
  await ensureStore()
  const raw = await readFile(logsPath, 'utf8')
  const parsed = JSON.parse(raw) as Partial<LogStore>
  return { logs: parsed.logs ?? [] }
}

export const writeLogStore = async (store: LogStore) => {
  await ensureStore()
  await writeFile(logsPath, JSON.stringify(store, null, 2), 'utf8')
}
