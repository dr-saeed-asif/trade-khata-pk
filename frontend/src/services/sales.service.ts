import { http } from '@/services/http'
import type { PaginatedResponse, SaleRecord } from '@/types'
import type { SaleInput } from '@/lib/validators'

interface PaginatedApi<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export const salesService = {
  list: async (params?: {
    page?: number
    pageSize?: number
    search?: string
    partyId?: string
    from?: string
    to?: string
  }) => {
    const { data } = await http.get<PaginatedApi<SaleRecord>>('/sales', {
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
    } as PaginatedResponse<SaleRecord>
  },
  getById: async (id: string) => {
    const { data } = await http.get<SaleRecord>(`/sales/${id}`)
    return data
  },
  create: async (payload: SaleInput) => {
    const { data } = await http.post<SaleRecord>('/sales', payload)
    return data
  },
  update: async (id: string, payload: SaleInput) => {
    const { data } = await http.put<SaleRecord>(`/sales/${id}`, payload)
    return data
  },
  delete: async (id: string) => {
    await http.delete(`/sales/${id}`)
  },
}
