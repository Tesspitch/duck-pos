import { createContext, useContext } from 'react'
import type { HistoryDeletionInput, HistoryDeletionPreview, HistoryRange } from '../domain/history-deletion'

export interface HistoryDeletionRepository {
  preview(range: HistoryRange): Promise<HistoryDeletionPreview>
  remove(input: HistoryDeletionInput): Promise<HistoryDeletionPreview>
}
export const HistoryDeletionContext = createContext<HistoryDeletionRepository | null>(null)
export function useHistoryDeletionRepository() {
  const repository = useContext(HistoryDeletionContext)
  if (!repository) throw new Error('HistoryDeletionContext is missing')
  return repository
}
