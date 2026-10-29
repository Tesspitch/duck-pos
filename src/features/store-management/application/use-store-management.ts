import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useStoreManagementServices } from './store-management-context'

export const storeManagementQueryKey = (shopId: string) => ['store-management', shopId] as const

export function useStoreManagement(shopId: string | undefined) {
  const { repository, realtime } = useStoreManagementServices()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: storeManagementQueryKey(shopId ?? 'none'),
    enabled: Boolean(shopId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    queryFn: () => repository.get(shopId!),
  })

  useEffect(() => {
    if (!shopId) return
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: storeManagementQueryKey(shopId) })
    }
    const unsubscribe = realtime.subscribe(shopId, refresh)
    window.addEventListener('online', refresh)
    return () => {
      window.removeEventListener('online', refresh)
      unsubscribe()
    }
  }, [queryClient, realtime, shopId])

  return query
}

export function useOpenStore(shopId: string) {
  const { repository } = useStoreManagementServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => repository.open(shopId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeManagementQueryKey(shopId) }),
  })
}

export function useCloseStore(shopId: string) {
  const { repository } = useStoreManagementServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => repository.close(shopId, sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeManagementQueryKey(shopId) }),
  })
}

