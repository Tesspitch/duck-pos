import { useQuery } from '@tanstack/react-query'

import { useCustomerOrderingRepository } from './customer-ordering-context'

const terminalStatuses = new Set(['COMPLETED', 'CANCELLED'])

export function useOrderTracking(token: string | undefined) {
  const repository = useCustomerOrderingRepository()
  return useQuery({
    queryKey: ['customer-order-tracking', token ?? 'missing'],
    enabled: Boolean(token),
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: () => repository.track(token!),
    refetchInterval: (query) => {
      if (document.visibilityState === 'hidden') return false
      const status = query.state.data?.status
      return status && terminalStatuses.has(status) ? false : 7_000
    },
  })
}
