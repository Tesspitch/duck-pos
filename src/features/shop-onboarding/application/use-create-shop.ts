import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { CreateShopInput } from '../domain/shop-creation-access'
import { useShopOnboardingRepository } from './shop-onboarding-repository-context'

export function useCreateShop() {
  const repository = useShopOnboardingRepository()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateShopInput) => repository.createShop(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['memberships'] }),
        queryClient.invalidateQueries({ queryKey: ['shop-creation-access'] }),
      ])
    },
  })
}

