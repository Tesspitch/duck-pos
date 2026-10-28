import { createContext, useContext } from 'react'

import type { Membership } from '../../access-control/domain/membership'

export interface ActiveShopContextValue {
  activeMembership: Membership | null
  memberships: Membership[]
  selectShop: (shopId: string) => void
}

export const ActiveShopContext = createContext<ActiveShopContextValue | null>(null)

export function useActiveShop() {
  const context = useContext(ActiveShopContext)
  if (!context) throw new Error('useActiveShop must be used inside ActiveShopProvider')
  return context
}
