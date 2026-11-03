import type { StoreManagement } from '../domain/store-session'

export interface StoreManagementRepository {
  get(shopId: string): Promise<StoreManagement>
  open(shopId: string): Promise<void>
  close(shopId: string, sessionId: string): Promise<void>
  setAcceptingOrders(shopId: string, sessionId: string, accepting: boolean): Promise<void>
}

