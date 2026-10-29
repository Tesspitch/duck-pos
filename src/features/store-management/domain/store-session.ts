export type StoreSessionStatus = 'OPEN' | 'CLOSED'

export interface ActiveStoreSession {
  id: string
  businessDate: string
  openedAt: string
  pendingOrderCount: number
}

export interface StoreSessionHistory {
  id: string
  businessDate: string
  status: StoreSessionStatus
  openedAt: string
  closedAt: string | null
  openedBy: string | null
  closedBy: string | null
  orderCount: number
  completedOrderCount: number
  collectedSatang: number
}

export interface StoreManagement {
  isOpen: boolean
  activeSession: ActiveStoreSession | null
  history: StoreSessionHistory[]
}

export const canCloseStore = (session: ActiveStoreSession | null) =>
  Boolean(session && session.pendingOrderCount === 0)

