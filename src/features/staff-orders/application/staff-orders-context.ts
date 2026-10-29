import { createContext, useContext } from 'react'

import type { StaffOrdersRealtime } from './staff-orders-realtime'
import type { StaffOrdersRepository } from './staff-orders-repository'

interface StaffOrdersServices {
  repository: StaffOrdersRepository
  realtime: StaffOrdersRealtime
}

export const StaffOrdersContext = createContext<StaffOrdersServices | null>(null)

export function useStaffOrdersServices() {
  const services = useContext(StaffOrdersContext)
  if (!services) throw new Error('StaffOrdersProvider is missing.')
  return services
}

