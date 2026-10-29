import type { PropsWithChildren } from 'react'

import type { StaffOrdersRealtime } from './staff-orders-realtime'
import type { StaffOrdersRepository } from './staff-orders-repository'
import { StaffOrdersContext } from './staff-orders-context'

interface Props extends PropsWithChildren {
  repository: StaffOrdersRepository
  realtime: StaffOrdersRealtime
}

export function StaffOrdersProvider({ children, repository, realtime }: Props) {
  return <StaffOrdersContext.Provider value={{ repository, realtime }}>{children}</StaffOrdersContext.Provider>
}

