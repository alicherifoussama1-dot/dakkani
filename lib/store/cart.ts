// ============================================================
// Cart Store — Zustand + localStorage persistence
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  storeSlug: string
  productSlug: string
  name: string
  price: number
  image?: string
  qty: number
  variantKey?: string
}

interface CartState {
  items:     CartItem[]
  storeSlug: string | null // Cart is per-store
  add:    (item: Omit<CartItem,'qty'> & { qty?: number }) => void
  remove: (productId: string, variantKey?: string) => void
  update: (productId: string, qty: number, variantKey?: string) => void
  clear:  () => void
  total:  () => number
  count:  () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items:     [],
      storeSlug: null,

      add: (item) => {
        const { items, storeSlug } = get()
        // If different store, clear cart first
        if (storeSlug && storeSlug !== item.storeSlug) {
          set({ items: [], storeSlug: item.storeSlug })
        }
        const existing = items.find(
          i => i.productId === item.productId && i.variantKey === item.variantKey
        )
        if (existing) {
          set({
            items: items.map(i =>
              i.productId === item.productId && i.variantKey === item.variantKey
                ? { ...i, qty: i.qty + (item.qty ?? 1) }
                : i
            ),
          })
        } else {
          set({
            items: [...items, { ...item, qty: item.qty ?? 1 }],
            storeSlug: item.storeSlug,
          })
        }
      },

      remove: (productId, variantKey) => {
        set(s => ({
          items: s.items.filter(
            i => !(i.productId === productId && i.variantKey === variantKey)
          ),
        }))
      },

      update: (productId, qty, variantKey) => {
        if (qty <= 0) {
          get().remove(productId, variantKey)
          return
        }
        set(s => ({
          items: s.items.map(i =>
            i.productId === productId && i.variantKey === variantKey
              ? { ...i, qty }
              : i
          ),
        }))
      },

      clear: () => set({ items: [], storeSlug: null }),

      total: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),

      count: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    {
      name: 'dakkani-cart',
      skipHydration: true,
    }
  )
)
