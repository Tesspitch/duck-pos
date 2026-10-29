import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { OrderStatus, PaymentMethod } from '../domain/staff-order'
import { useStaffOrdersServices } from './staff-orders-context'
import type { CreatePosOrderInput } from './staff-orders-repository'
import { staffOrdersQueryKey } from './use-staff-orders'

export function useCreatePosOrder(shopId: string) {
  const { repository } = useStaffOrdersServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreatePosOrderInput, 'shopId'>) => repository.createPosOrder({ ...input, shopId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffOrdersQueryKey(shopId) }),
  })
}

export function useUpdateOrderStatus(shopId: string) {
  const { repository } = useStaffOrdersServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { orderId: string; expected: OrderStatus; next: OrderStatus; reason?: string }) =>
      repository.updateStatus(input.orderId, input.expected, input.next, input.reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffOrdersQueryKey(shopId) }),
  })
}

export function useRecordOrderPayment(shopId: string) {
  const { repository } = useStaffOrdersServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { orderId: string; method: PaymentMethod; amountReceivedSatang: number }) =>
      repository.recordPayment(input.orderId, input.method, input.amountReceivedSatang),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffOrdersQueryKey(shopId) }),
  })
}

