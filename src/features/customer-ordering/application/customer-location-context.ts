import { createContext, useContext } from 'react'

import type { CustomerLocationService } from './customer-location-service'

export const CustomerLocationContext = createContext<CustomerLocationService | null>(null)

export function useCustomerLocationService() {
  const service = useContext(CustomerLocationContext)
  if (!service) throw new Error('CustomerLocationServiceProvider is missing')
  return service
}
