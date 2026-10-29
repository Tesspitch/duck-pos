import type { PropsWithChildren } from 'react'

import type { CustomerOrderingRepository } from './customer-ordering-repository'
import { CustomerOrderingContext } from './customer-ordering-context'

export function CustomerOrderingRepositoryProvider({
  repository,
  children,
}: PropsWithChildren<{ repository: CustomerOrderingRepository }>) {
  return <CustomerOrderingContext.Provider value={repository}>{children}</CustomerOrderingContext.Provider>
}
