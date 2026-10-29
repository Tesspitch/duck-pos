import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { LineNotificationSettings, LineSubscriptionStatus } from '../domain/line-notification'
import { useLineNotificationRepository } from './line-notification-context'

const key = (shopId: string) => ['line-notifications', shopId]

export function useLineNotificationManagement(shopId: string) {
  const repository = useLineNotificationRepository()
  return useQuery({
    queryKey: key(shopId),
    enabled: Boolean(shopId),
    queryFn: () => repository.getManagement(shopId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useUpdateLineSettings(shopId: string) {
  const repository = useLineNotificationRepository()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (settings: LineNotificationSettings) => repository.updateSettings(shopId, settings),
    onSuccess: (data) => client.setQueryData(key(shopId), data),
  })
}

export function useSetLineSubscriptionStatus(shopId: string) {
  const repository = useLineNotificationRepository()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ subscriptionId, status }: { subscriptionId: string; status: Extract<LineSubscriptionStatus, 'APPROVED' | 'REVOKED'> }) =>
      repository.setSubscriptionStatus(shopId, subscriptionId, status),
    onSuccess: () => client.invalidateQueries({ queryKey: key(shopId) }),
  })
}

