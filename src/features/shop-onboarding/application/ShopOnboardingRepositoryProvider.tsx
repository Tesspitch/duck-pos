import type { PropsWithChildren } from 'react'

import type { ShopOnboardingRepository } from './shop-onboarding-repository'
import { ShopOnboardingRepositoryContext } from './shop-onboarding-repository-context'

interface ShopOnboardingRepositoryProviderProps extends PropsWithChildren {
  repository: ShopOnboardingRepository
}

export function ShopOnboardingRepositoryProvider({
  children,
  repository,
}: ShopOnboardingRepositoryProviderProps) {
  return (
    <ShopOnboardingRepositoryContext.Provider value={repository}>
      {children}
    </ShopOnboardingRepositoryContext.Provider>
  )
}

