import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

const TOKEN_KEY = 'inventory_jwt'
const USER_KEY = 'inventory_user'
const normalizeUser = (value: User | null): User | null =>
  value
    ? {
        ...value,
        role: value.role ?? 'USER',
      }
    : null

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: normalizeUser(JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as User | null),
  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)))
    set({ token, user: normalizeUser(user) })
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null })
  },
}))
