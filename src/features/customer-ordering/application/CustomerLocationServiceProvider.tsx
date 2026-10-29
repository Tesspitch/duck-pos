import type { PropsWithChildren } from 'react'

import { CustomerLocationContext } from './customer-location-context'
import type { CustomerLocationService } from './customer-location-service'

export function CustomerLocationServiceProvider({ service, children }: PropsWithChildren<{ service: CustomerLocationService }>) {
  return <CustomerLocationContext.Provider value={service}>{children}</CustomerLocationContext.Provider>
}
