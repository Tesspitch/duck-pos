import { useQuery } from '@tanstack/react-query'

import { useCustomerOrderingRepository } from './customer-ordering-context'

export function usePublicMenu(shopId: string | undefined) {
  const repository = useCustomerOrderingRepository()
  return useQuery({
    queryKey: ['public-menu', shopId ?? 'missing'],
    enabled: Boolean(shopId),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: () => repository.getMenu(shopId!),
  })
}
