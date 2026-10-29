import { createContext, useContext } from 'react'

import type { CustomerOrderingRepository } from './customer-ordering-repository'

export const CustomerOrderingContext = createContext<CustomerOrderingRepository | null>(null)

export function useCustomerOrderingRepository() {
  const repository = useContext(CustomerOrderingContext)
  if (!repository) throw new Error('CustomerOrderingRepositoryProvider is missing')
  return repository
}
