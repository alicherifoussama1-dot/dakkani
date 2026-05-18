import { create } from 'zustand'
import type { Order, OrderStatus } from '@/types'

interface OrderFilters {
  status?: OrderStatus
  search?: string
  wilayaId?: number
  dateFrom?: string
  dateTo?: string
}

interface OrderState {
  orders: Order[]
  filters: OrderFilters
  totalCount: number
  page: number
  pageSize: number
  setOrders: (orders: Order[], total: number) => void
  setFilters: (filters: Partial<OrderFilters>) => void
  setPage: (page: number) => void
  resetFilters: () => void
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  filters: {},
  totalCount: 0,
  page: 1,
  pageSize: 20,
  setOrders: (orders, totalCount) => set({ orders, totalCount }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters }, page: 1 })),
  setPage: (page) => set({ page }),
  resetFilters: () => set({ filters: {}, page: 1 }),
}))
