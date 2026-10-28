import { useQuery } from '@tanstack/react-query'

import { useAuth } from '../../auth/application/auth-context'
import { useMembershipRepository } from './membership-repository-context'

export const membershipQueryKey = (userId: string) => ['memberships', userId] as const

export function useMemberships() {
  const { user } = useAuth()
  const repository = useMembershipRepository()

  return useQuery({
    queryKey: membershipQueryKey(user?.id ?? 'anonymous'),
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: () => repository.listActiveForUser(user!.id),
  })
}

