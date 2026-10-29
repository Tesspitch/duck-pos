import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { CartLine } from '../domain/customer-order'

interface CartState {
  shopId: string | null
  lines: CartLine[]
  ensureShop: (shopId: string) => void
  addLine: (line: CartLine) => void
  changeQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  clear: () => void
}

export const useCartStore = create<CartState>()(persist(
  (set) => ({
    shopId: null,
    lines: [],
    ensureShop: (shopId) => set((state) => state.shopId === shopId ? state : { shopId, lines: [] }),
    addLine: (line) => set((state) => ({ lines: [...state.lines, line] })),
    changeQuantity: (key, quantity) => set((state) => ({
      lines: state.lines.map((line) => line.key === key ? { ...line, quantity: Math.max(1, Math.min(20, quantity)) } : line),
    })),
    removeLine: (key) => set((state) => ({ lines: state.lines.filter((line) => line.key !== key) })),
    clear: () => set({ lines: [] }),
  }),
  {
    name: 'duckpos-customer-cart',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({ shopId: state.shopId, lines: state.lines }),
  },
))

export const cartLineTotal = (line: CartLine) => (
  line.basePriceSatang + line.options.reduce((sum, option) => sum + option.priceDeltaSatang, 0)
) * line.quantity
