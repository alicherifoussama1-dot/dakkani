import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Store, StoreSettings } from '@/types'

interface StoreState {
  currentStore: Store | null
  settings: StoreSettings | null
  setStore: (store: Store) => void
  setSettings: (settings: StoreSettings) => void
  clearStore: () => void
}

export const useStoreStore = create<StoreState>()(
  persist(
    (set) => ({
      currentStore: null,
      settings: null,
      setStore: (store) => set({ currentStore: store }),
      setSettings: (settings) => set({ settings }),
      clearStore: () => set({ currentStore: null, settings: null }),
    }),
    { name: 'dakkani-store' }
  )
)
