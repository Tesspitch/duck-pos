import { createContext, useContext } from 'react'

import type { ShopOnboardingRepository } from './shop-onboarding-repository'

export const ShopOnboardingRepositoryContext = createContext<ShopOnboardingRepository | null>(null)

export function useShopOnboardingRepository() {
  const repository = useContext(ShopOnboardingRepositoryContext)
  if (!repository) {
    throw new Error('useShopOnboardingRepository must be used inside ShopOnboardingRepositoryProvider')
  }
  return repository
}

