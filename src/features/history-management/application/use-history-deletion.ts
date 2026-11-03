import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useHistoryDeletionRepository } from './history-deletion-context'
import type { HistoryDeletionInput, HistoryRange, OrderDeletionInput, OrderDeletionTarget } from '../domain/history-deletion'

export function useHistoryDeletion() {
  const repository = useHistoryDeletionRepository()
  const client = useQueryClient()
  const preview = useMutation({ mutationFn: (range: HistoryRange) => repository.preview(range) })
  const remove = useMutation({
    mutationFn: (input: HistoryDeletionInput) => repository.remove(input),
    onSuccess: (_, input) => Promise.all((input.kind === 'SALES'
      ? ['sales-dashboard', 'sales-history', 'sales-sessions', 'store-management', 'staff-orders', 'customer-order-tracking', 'line-notifications']
      : ['line-notifications']).map((key) => client.invalidateQueries({ queryKey: key === 'customer-order-tracking' ? [key] : [key, input.shopId] }))),
  })
  const previewOrder = useMutation({ mutationFn: (target: OrderDeletionTarget) => repository.previewOrder(target) })
  const removeOrder = useMutation({
    mutationFn: (input: OrderDeletionInput) => repository.removeOrder(input),
    onSuccess: (_, input) => Promise.all(['sales-dashboard', 'sales-history', 'sales-sessions', 'store-management', 'staff-orders', 'customer-order-tracking', 'line-notifications']
      .map((key) => client.invalidateQueries({ queryKey: key === 'customer-order-tracking' ? [key] : [key, input.shopId] }))),
  })
  return { preview, remove, previewOrder, removeOrder }
}
