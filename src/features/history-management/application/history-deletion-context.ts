import { createContext, useContext } from 'react'
import type { HistoryDeletionInput, HistoryDeletionPreview, HistoryRange, OrderDeletionInput, OrderDeletionPreview, OrderDeletionTarget } from '../domain/history-deletion'

export interface HistoryDeletionRepository {
  preview(range: HistoryRange): Promise<HistoryDeletionPreview>
  remove(input: HistoryDeletionInput): Promise<HistoryDeletionPreview>
  previewOrder(target: OrderDeletionTarget): Promise<OrderDeletionPreview>
  removeOrder(input: OrderDeletionInput): Promise<OrderDeletionPreview>
}
export const HistoryDeletionContext = createContext<HistoryDeletionRepository | null>(null)
export function useHistoryDeletionRepository() {
  const repository = useContext(HistoryDeletionContext)
  if (!repository) throw new Error('HistoryDeletionContext is missing')
  return repository
}
