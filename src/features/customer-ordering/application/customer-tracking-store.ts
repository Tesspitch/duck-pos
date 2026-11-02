import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface TrackingState {
  tokensByShop: Record<string, string>
  remember: (shopId: string, token: string) => void
}

// Private to this browser tab; tracking tokens never enter a public cache.
export const useCustomerTrackingStore = create<TrackingState>()(persist(
  (set) => ({
    tokensByShop: {},
    remember: (shopId, token) => set((state) => state.tokensByShop[shopId] === token
      ? state : { tokensByShop: { ...state.tokensByShop, [shopId]: token } }),
  }),
  { name: 'duckpos-customer-tracking', storage: createJSONStorage(() => sessionStorage) },
))
