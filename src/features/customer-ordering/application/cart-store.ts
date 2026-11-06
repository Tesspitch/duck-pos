import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { CartLine } from '../domain/customer-order'

interface CartState {
  shopId: string | null
  lines: CartLine[]
  orderNote: string
  request: { signature: string; idempotencyKey: string; trackingToken: string } | null
  setOrderNote: (note: string) => void
  checkoutIdentity: (signature: string) => { idempotencyKey: string; trackingToken: string }
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
    orderNote: '',
    request: null,
    setOrderNote: (note) => set({orderNote:note.slice(0,500)}),
    checkoutIdentity: (signature) => {
      let identity!: {idempotencyKey:string;trackingToken:string}
      set(state=>{
        const request=state.request?.signature===signature?state.request:{signature,idempotencyKey:crypto.randomUUID(),trackingToken:crypto.randomUUID()}
        identity=request
        return {request}
      })
      return identity
    },
    ensureShop: (shopId) => set((state) => state.shopId === shopId ? state : { shopId, lines: [], orderNote:'',request:null }),
    addLine: (line) => set((state) => ({ lines: [...state.lines, line] })),
    changeQuantity: (key, quantity) => set((state) => ({
      lines: state.lines.map((line) => line.key === key && Number.isFinite(quantity) ? { ...line, quantity: Math.max(1, Math.min(20, Math.trunc(quantity))) } : line),
    })),
    removeLine: (key) => set((state) => ({ lines: state.lines.filter((line) => line.key !== key) })),
    clear: () => set({ lines: [],orderNote:'',request:null }),
  }),
  {
    name: 'duckpos-customer-cart',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({ shopId: state.shopId, lines: state.lines,orderNote:state.orderNote,request:state.request }),
  },
))

export const cartLineTotal = (line: CartLine) => (
  line.basePriceSatang + line.options.reduce((sum, option) => sum + option.priceDeltaSatang, 0)
) * line.quantity
