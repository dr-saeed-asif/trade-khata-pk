import { http } from '@/services/http'

export interface AdminUserRow {
  id: string
  name: string
  username?: string | null
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface AdminUserInput {
  name: string
  username?: string
  email: string
  password?: string
  role: string
}

export interface AdminRoleRow {
  id: string
  roleKey: string
  name: string
  role: string
  permissions: string[]
  actions?: string[]
  modules?: string[]
  userCount: number
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminRoleInput {
  name: string
  permissions: string[]
}

export const adminService = {
  listUsers: async () => {
    const { data } = await http.get<AdminUserRow[]>('/admin/users')
    return data
  },

  listRoles: async () => {
    const { data } = await http.get<AdminRoleRow[]>('/admin/roles')
    return data
  },

  createUser: async (payload: AdminUserInput) => {
    const { data } = await http.post<AdminUserRow>('/admin/users', payload)
    return data
  },

  updateUser: async (id: string, payload: AdminUserInput) => {
    const { data } = await http.put<AdminUserRow>(`/admin/users/${id}`, payload)
    return data
  },

  deleteUser: async (id: string) => {
    await http.delete(`/admin/users/${id}`)
  },

  createRole: async (payload: AdminRoleInput) => {
    const { data } = await http.post<AdminRoleRow>('/admin/roles', payload)
    return data
  },

  updateRole: async (id: string, payload: AdminRoleInput) => {
    const { data } = await http.put<AdminRoleRow>(`/admin/roles/${id}`, payload)
    return data
  },

  deleteRole: async (id: string) => {
    await http.delete(`/admin/roles/${id}`)
  },
}