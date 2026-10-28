import { useQuery } from '@tanstack/react-query'

import { useAuth } from '../../auth/application/auth-context'
import { useShopOnboardingRepository } from './shop-onboarding-repository-context'

export function useShopCreationAccess() {
  const { user } = useAuth()
  const repository = useShopOnboardingRepository()

  return useQuery({
    queryKey: ['shop-creation-access', user?.id ?? 'anonymous'],
    enabled: Boolean(user),
    staleTime: 30_000,
    queryFn: () => repository.getAccessForUser(user!.id),
  })
}

