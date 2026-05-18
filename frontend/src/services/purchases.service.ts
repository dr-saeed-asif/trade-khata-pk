import { http } from '@/services/http'
import type { PaginatedResponse, PurchaseRecord } from '@/types'
import type { PurchaseInput } from '@/lib/validators'

interface PaginatedApi<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export const purchasesService = {
  list: async (params?: {
    page?: number
    pageSize?: number
    search?: string
    partyId?: string
    from?: string
    to?: string
  }) => {
    const { data } = await http.get<PaginatedApi<PurchaseRecord>>('/purchases', {
      params: {
        page: params?.page ?? 1,
        limit: params?.pageSize ?? 10,
        search: params?.search || undefined,
        partyId: params?.partyId || undefined,
        from: params?.from || undefined,
        to: params?.to || undefined,
      },
    })
    return {
      data: data.data,
      total: data.total,
      page: data.page,
      pageSize: data.limit,
    } as PaginatedResponse<PurchaseRecord>
  },
  getById: async (id: string) => {
    const { data } = await http.get<PurchaseRecord>(`/purchases/${id}`)
    return data
  },
  create: async (payload: PurchaseInput) => {
    const { data } = await http.post<PurchaseRecord>('/purchases', payload)
    return data
  },
  update: async (id: string, payload: PurchaseInput) => {
    const { data } = await http.put<PurchaseRecord>(`/purchases/${id}`, payload)
    return data
  },
  delete: async (id: string) => {
    await http.delete(`/purchases/${id}`)
  },
}
