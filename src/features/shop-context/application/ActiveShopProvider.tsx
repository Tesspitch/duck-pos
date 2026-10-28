import { useCallback, useMemo, useState, type PropsWithChildren } from 'react'

import { useMemberships } from '../../access-control/application/use-memberships'
import { useAuth } from '../../auth/application/auth-context'
import { ActiveShopContext } from './active-shop-context'

const storageKey = (userId: string) => `duckpos.active-shop.${userId}`

export function ActiveShopProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const { data: memberships = [] } = useMemberships()
  const [sessionSelections, setSessionSelections] = useState<Record<string, string>>({})
  const selectedShopId = user
    ? sessionSelections[user.id] ?? localStorage.getItem(storageKey(user.id))
    : null

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.shop_id === selectedShopId) ?? memberships[0] ?? null,
    [memberships, selectedShopId],
  )

  const selectShop = useCallback((shopId: string) => {
    if (!user) return
    setSessionSelections((current) => ({ ...current, [user.id]: shopId }))
    localStorage.setItem(storageKey(user.id), shopId)
  }, [user])

  const value = useMemo(
    () => ({ activeMembership, memberships, selectShop }),
    [activeMembership, memberships, selectShop],
  )

  return <ActiveShopContext.Provider value={value}>{children}</ActiveShopContext.Provider>
}
