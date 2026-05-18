import { http } from '@/services/http'
import type { Category, PaginatedResponse } from '@/types'
import type { CategoryInput } from '@/lib/validators'

interface PaginatedApi<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export const categoryService = {
  list: async (params?: { page?: number; pageSize?: number }) => {
    const { data } = await http.get<PaginatedApi<Category>>('/categories', {
      params: { page: params?.page ?? 1, limit: params?.pageSize ?? 10 },
    })
    return {
      data: data.data,
      total: data.total,
      page: data.page,
      pageSize: data.limit,
    } as PaginatedResponse<Category>
  },
  getById: async (id: string) => {
    const { data } = await http.get<Category>(`/categories/${id}`)
    return data
  },
  create: async (payload: CategoryInput) => {
    const { data } = await http.post<Category>('/categories', payload)
    return data
  },
  update: async (id: string, payload: CategoryInput) => {
    const { data } = await http.put<Category>(`/categories/${id}`, payload)
    return data
  },
  delete: async (id: string) => {
    await http.delete(`/categories/${id}`)
  },
}
