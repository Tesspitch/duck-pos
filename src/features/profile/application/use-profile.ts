import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../../auth/application/auth-context'
import { useProfileRepository } from './profile-repository-context'

export const profileQueryKey = (userId: string) => ['profile', userId] as const

export function useProfile() {
  const { user } = useAuth()
  const repository = useProfileRepository()
  const queryClient = useQueryClient()
  const queryKey = profileQueryKey(user?.id ?? 'anonymous')

  const profile = useQuery({
    queryKey,
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: () => repository.get(user!.id),
  })

  const update = useMutation({
    mutationFn: (displayName: string) => repository.updateDisplayName(displayName),
    onSuccess: (saved) => queryClient.setQueryData(queryKey, saved),
  })

  return { profile, update }
}
