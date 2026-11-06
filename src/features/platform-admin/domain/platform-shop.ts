export interface PlatformShop {
  id: string
  name: string
  isOpen: boolean
  acceptingOrders: boolean
  activeSessionId: string | null
}
