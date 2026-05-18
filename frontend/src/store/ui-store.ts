import { create } from 'zustand'

export type AppLocale = 'en' | 'ur'

interface UiState {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
}

const LOCALE_KEY = 'inventory_locale'

const normalizeLocale = (value: string | null): AppLocale => (value === 'ur' ? 'ur' : 'en')

export const useUiStore = create<UiState>((set) => ({
  locale: normalizeLocale(localStorage.getItem(LOCALE_KEY)),
  setLocale: (locale) => {
    localStorage.setItem(LOCALE_KEY, locale)
    set({ locale })
  },
}))

