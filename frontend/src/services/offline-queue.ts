import type { AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth-store'

type QueuedMethod = 'post' | 'put' | 'patch' | 'delete'

type QueueItem = {
  id: string
  createdAt: number
  url: string
  method: QueuedMethod
  data?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

const DB_NAME = 'qr-inventory-offline-db'
const STORE_NAME = 'request_queue'
const DB_VERSION = 1
const QUEUEABLE_PATTERNS = [/^\/scan/, /^\/stock\//, /^\/alerts\//]

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const transactionDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

const getAllQueueItems = async () => {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const items = await requestToPromise(store.getAll()) as QueueItem[]
  db.close()
  return items.sort((a, b) => a.createdAt - b.createdAt)
}

const addQueueItem = async (item: QueueItem) => {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put(item)
  await transactionDone(tx)
  db.close()
}

const removeQueueItem = async (id: string) => {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(id)
  await transactionDone(tx)
  db.close()
}

const isQueueableRequest = (config: AxiosRequestConfig) => {
  if (!config.url || !config.method) return false
  const method = config.method.toLowerCase() as QueuedMethod
  if (!['post', 'put', 'patch', 'delete'].includes(method)) return false
  if (config.data instanceof FormData) return false
  return QUEUEABLE_PATTERNS.some((pattern) => pattern.test(config.url ?? ''))
}

export const shouldQueueOfflineRequest = (config?: AxiosRequestConfig) => {
  if (!config || typeof window === 'undefined') return false
  return !navigator.onLine && isQueueableRequest(config)
}

export const queueOfflineRequest = async (config: AxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  const normalizedMethod = (config.method?.toLowerCase() ?? 'post') as QueuedMethod
  const item: QueueItem = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    url: config.url ?? '',
    method: normalizedMethod,
    data: config.data,
    params: (config.params ?? undefined) as Record<string, unknown> | undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }
  await addQueueItem(item)
}

export const syncOfflineQueue = async () => {
  if (typeof window === 'undefined' || !navigator.onLine) return { synced: 0, failed: 0 }
  const items = await getAllQueueItems()
  let synced = 0
  let failed = 0

  for (const item of items) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}${item.url}`, {
        method: item.method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...(item.headers ?? {}),
        },
        body: item.method === 'delete' ? undefined : JSON.stringify(item.data ?? {}),
      })
      if (!response.ok) {
        failed += 1
        continue
      }
      await removeQueueItem(item.id)
      synced += 1
    } catch {
      failed += 1
    }
  }

  return { synced, failed }
}

export const initOfflineQueueSync = () => {
  if (typeof window === 'undefined') return
  void syncOfflineQueue().catch(() => undefined)
  window.addEventListener('online', () => {
    void syncOfflineQueue().catch(() => undefined)
  })
}
