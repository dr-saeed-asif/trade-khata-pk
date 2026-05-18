export type QueueJobType = 'refresh-item-alerts' | 'refresh-all-alerts'

export type QueueJob = {
  id: string
  type: QueueJobType
  payload: Record<string, unknown>
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
  error?: string
}

type QueueHandler = (job: QueueJob) => Promise<void>

const jobs: QueueJob[] = []
const handlers = new Map<QueueJobType, QueueHandler>()
let processing = false

const updateJob = (id: string, patch: Partial<QueueJob>) => {
  const job = jobs.find((entry) => entry.id === id)
  if (!job) return
  Object.assign(job, patch, { updatedAt: new Date().toISOString() })
}

const processJobs = async () => {
  if (processing) return
  processing = true
  try {
    for (const job of jobs) {
      if (job.status !== 'queued') continue
      const handler = handlers.get(job.type)
      if (!handler) continue

      updateJob(job.id, { status: 'processing' })
      try {
        await handler(job)
        updateJob(job.id, { status: 'completed', error: undefined })
      } catch (error) {
        updateJob(job.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown queue failure',
        })
      }
    }
  } finally {
    processing = false
  }
}

export const queueSystem = {
  register: (type: QueueJobType, handler: QueueHandler) => {
    handlers.set(type, handler)
  },
  enqueue: async (type: QueueJobType, payload: Record<string, unknown>) => {
    const job: QueueJob = {
      id: crypto.randomUUID(),
      type,
      payload,
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    jobs.unshift(job)
    jobs.splice(100)
    void processJobs()
    return job
  },
  snapshot: () => ({
    pending: jobs.filter((job) => job.status === 'queued').length,
    processing: jobs.filter((job) => job.status === 'processing').length,
    completed: jobs.filter((job) => job.status === 'completed').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
    recent: jobs.slice(0, 25),
  }),
  processNow: async () => {
    await processJobs()
  },
}
