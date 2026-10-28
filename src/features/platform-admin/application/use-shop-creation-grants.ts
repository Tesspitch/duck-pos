import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { usePlatformAdminRepository } from './platform-admin-repository-context'

export function useShopCreationGrants() {
  const repository = usePlatformAdminRepository()
  const queryClient = useQueryClient()
  const queryKey = ['shop-creation-grants'] as const

  const grants = useQuery({
    queryKey,
    queryFn: () => repository.listShopCreationGrants(),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey })

  const grant = useMutation({
    mutationFn: (userId: string) => repository.grantShopCreation(userId),
    onSuccess: refresh,
  })

  const revoke = useMutation({
    mutationFn: (userId: string) => repository.revokeShopCreation(userId),
    onSuccess: refresh,
  })

  return { grants, grant, revoke }
}

