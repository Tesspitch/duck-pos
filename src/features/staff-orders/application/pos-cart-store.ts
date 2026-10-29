import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { PosCartLine } from '../domain/pos-cart'

interface PosCartState {
  shopId: string | null
  lines: PosCartLine[]
  orderNote: string
  requestId: string
  ensureShop: (shopId: string) => void
  addLine: (line: PosCartLine) => void
  changeQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  setOrderNote: (note: string) => void
  clear: () => void
}

export const usePosCartStore = create<PosCartState>()(persist(
  (set) => ({
    shopId: null,
    lines: [],
    orderNote: '',
    requestId: crypto.randomUUID(),
    ensureShop: (shopId) => set((state) => state.shopId === shopId
      ? state
      : { shopId, lines: [], orderNote: '', requestId: crypto.randomUUID() }),
    addLine: (line) => set((state) => ({ lines: [...state.lines, line], requestId: crypto.randomUUID() })),
    changeQuantity: (key, quantity) => set((state) => ({
      lines: state.lines.map((line) => line.key === key
        ? { ...line, quantity: Math.max(1, Math.min(20, quantity)) }
        : line),
      requestId: crypto.randomUUID(),
    })),
    removeLine: (key) => set((state) => ({ lines: state.lines.filter((line) => line.key !== key), requestId: crypto.randomUUID() })),
    setOrderNote: (orderNote) => set({ orderNote: orderNote.slice(0, 500), requestId: crypto.randomUUID() }),
    clear: () => set({ lines: [], orderNote: '', requestId: crypto.randomUUID() }),
  }),
  {
    name: 'duckpos-staff-pos-cart',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({ shopId: state.shopId, lines: state.lines, orderNote: state.orderNote, requestId: state.requestId }),
  },
))

