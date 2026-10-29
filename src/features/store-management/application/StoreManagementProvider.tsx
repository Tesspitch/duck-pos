import type { PropsWithChildren } from 'react'

import { StoreManagementContext } from './store-management-context'
import type { StoreManagementRealtime } from './store-management-realtime'
import type { StoreManagementRepository } from './store-management-repository'

interface Props extends PropsWithChildren {
  repository: StoreManagementRepository
  realtime: StoreManagementRealtime
}

export function StoreManagementProvider({ children, repository, realtime }: Props) {
  return <StoreManagementContext.Provider value={{ repository, realtime }}>{children}</StoreManagementContext.Provider>
}

