import { useQuery } from '@tanstack/react-query'

import { useStaffOrdersServices } from './staff-orders-context'

export const staffOrdersQueryKey = (shopId: string) => ['staff-orders', shopId] as const

export function useStaffOrders(shopId: string | undefined) {
  const { repository } = useStaffOrdersServices()
  return useQuery({
    queryKey: staffOrdersQueryKey(shopId ?? 'none'),
    enabled: Boolean(shopId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    queryFn: () => repository.listActive(shopId!),
  })
}

