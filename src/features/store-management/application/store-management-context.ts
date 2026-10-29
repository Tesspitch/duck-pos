import { createContext, useContext } from 'react'

import type { StoreManagementRealtime } from './store-management-realtime'
import type { StoreManagementRepository } from './store-management-repository'

interface StoreManagementServices {
  repository: StoreManagementRepository
  realtime: StoreManagementRealtime
}

export const StoreManagementContext = createContext<StoreManagementServices | null>(null)

export function useStoreManagementServices() {
  const services = useContext(StoreManagementContext)
  if (!services) throw new Error('StoreManagementProvider is missing.')
  return services
}

