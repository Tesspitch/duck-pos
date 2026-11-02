import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface TrackingState {
  tokensByShop: Record<string, string>
  historyByShop: Record<string, string[]>
  remember: (shopId: string, token: string) => void
}

// Private to this browser tab; tracking tokens never enter a public cache.
export const useCustomerTrackingStore = create<TrackingState>()(persist(
  (set) => ({
    tokensByShop: {},
    historyByShop: {},
    remember: (shopId, token) => set((state) => {
      const previous = state.tokensByShop[shopId]
      const history = state.historyByShop[shopId] ?? []
      const tokens = [...new Set([...history, ...(previous ? [previous] : [])])]
      if (!tokens.includes(token)) tokens.unshift(token)
      if (previous === token && history.includes(token)) return state
      return {
        tokensByShop: { ...state.tokensByShop, [shopId]: token },
        historyByShop: { ...state.historyByShop, [shopId]: tokens },
      }
    }),
  }),
  { name: 'duckpos-customer-tracking', storage: createJSONStorage(() => sessionStorage) },
))
