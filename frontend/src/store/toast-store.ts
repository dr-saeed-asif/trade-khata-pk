import { create } from 'zustand'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'error'
}

interface ToastState {
  items: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (toast) =>
    set((state) => ({
      items: [...state.items, { id: crypto.randomUUID(), ...toast }],
    })),
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}))
