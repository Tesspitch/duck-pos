import { useQuery } from '@tanstack/react-query'

import { useAuth } from '../../auth/application/auth-context'
import { usePlatformAdminRepository } from './platform-admin-repository-context'

export function usePlatformAdmin() {
  const { user } = useAuth()
  const repository = usePlatformAdminRepository()

  return useQuery({
    queryKey: ['platform-admin', user?.id ?? 'anonymous'],
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: () => repository.isPlatformAdmin(user!.id),
  })
}

