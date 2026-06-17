import { http } from '@/services/http'
import type {
  ChangePasswordInput,
  DeleteAccountInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@/lib/validators'
import type { User } from '@/types'

interface LoginResponse {
  token: string
  user: User
}

interface RegisterResponse {
  message: string
  user: Pick<User, 'id' | 'name' | 'email' | 'role'>
}

export interface UserProfile extends User {
  username?: string | null
  createdAt?: string
}

export const authService = {
  register: async (payload: RegisterInput) => {
    const { data } = await http.post<RegisterResponse>('/auth/register', payload)
    return data
  },

  login: async (payload: LoginInput) => {
    const { data } = await http.post<LoginResponse>('/auth/login', payload)
    return data
  },

  getProfile: async () => {
    const { data } = await http.get<UserProfile>('/auth/me')
    return data
  },

  updateProfile: async (payload: UpdateProfileInput) => {
    const { data } = await http.put<LoginResponse>('/auth/me', payload)
    return data
  },

  changePassword: async (payload: Pick<ChangePasswordInput, 'currentPassword' | 'newPassword'>) => {
    const { data } = await http.put<{ message: string }>('/auth/me/password', payload)
    return data
  },

  deleteAccount: async (payload: DeleteAccountInput) => {
    const { data } = await http.delete<{ message: string }>('/auth/me', { data: payload })
    return data
  },

  refreshSession: async () => {
    const { data } = await http.post<LoginResponse>('/auth/refresh')
    return data
  },

  forgotPassword: async (email: string) => {
    const { data } = await http.post<{ message: string }>('/auth/forgot-password', { email })
    return data
  },
}
