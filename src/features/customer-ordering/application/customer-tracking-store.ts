import { create } from 'zustand'
import { migrateTabTracking, readSavedTracking, saveTrackingOrder, type SavedTracking } from '../infrastructure/customer-tracking-storage'

interface TrackingState {
  tokensByShop: Record<string, string>
  historyByShop: Record<string, string[]>
  remember: (shopId: string, token: string) => void
  refresh: () => void
}

function loadTracking(): SavedTracking {
  try {
    migrateTabTracking()
    return readSavedTracking()
  } catch { return { tokensByShop: {}, historyByShop: {} } }
}

// Private browser storage; no order details or tokens enter a public cache.
export const useCustomerTrackingStore = create<TrackingState>()((set, get) => ({
    ...loadTracking(),
    refresh: () => {
      try {
        migrateTabTracking()
        const saved = readSavedTracking()
        set((state) => JSON.stringify([state.tokensByShop, state.historyByShop]) === JSON.stringify([saved.tokensByShop, saved.historyByShop]) ? state : saved)
      } catch { /* Keep the current tab usable when browser storage is blocked. */ }
    },
    remember: (shopId, token) => {
      let saved: SavedTracking | undefined
      try {
        migrateTabTracking()
        const known = get()
        for (const [knownShop, tokens] of Object.entries(known.historyByShop)) {
          for (const knownToken of [...tokens].reverse()) saveTrackingOrder(knownShop, knownToken, false)
        }
        for (const [knownShop, knownToken] of Object.entries(known.tokensByShop)) saveTrackingOrder(knownShop, knownToken, false)
        saveTrackingOrder(shopId, token)
        saved = readSavedTracking()
      } catch { /* Checkout must still succeed if local storage is unavailable. */ }
      set((state) => {
      if (saved) {
        return JSON.stringify([state.tokensByShop, state.historyByShop]) === JSON.stringify([saved.tokensByShop, saved.historyByShop]) ? state : saved
      }
      const previous = state.tokensByShop[shopId]
      const history = state.historyByShop[shopId] ?? []
      const tokens = [...new Set([...history, ...(previous ? [previous] : [])])]
      if (!tokens.includes(token)) tokens.unshift(token)
      if (previous === token && history.includes(token)) return state
      return {
        tokensByShop: { ...state.tokensByShop, [shopId]: token },
        historyByShop: { ...state.historyByShop, [shopId]: tokens },
      }
      })
    },
}))
