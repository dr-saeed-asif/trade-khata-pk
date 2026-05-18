import axios from 'axios'
import { useAuthStore } from '@/store/auth-store'
import { queueOfflineRequest, shouldQueueOfflineRequest } from '@/services/offline-queue'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
})

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const canQueue = shouldQueueOfflineRequest(error.config)
    const networkFailureQueueable =
      !error.response &&
      error.config &&
      ['post', 'put', 'patch', 'delete'].includes((error.config.method ?? '').toLowerCase()) &&
      error.config.url &&
      ['/scan', '/stock/', '/alerts/'].some((prefix) => error.config.url.startsWith(prefix))

    if (canQueue || networkFailureQueueable) {
      await queueOfflineRequest(error.config)
      return Promise.resolve({
        data: {
          queued: true,
          offline: true,
          message: 'Action saved locally and will sync when online.',
        },
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config: error.config,
      })
    }

    return Promise.reject(error)
  },
)
