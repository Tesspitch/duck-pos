import { createContext, useContext } from 'react'

import type { LineNotificationRepository } from './line-notification-repository'

export const LineNotificationContext = createContext<LineNotificationRepository | null>(null)

export function useLineNotificationRepository() {
  const repository = useContext(LineNotificationContext)
  if (!repository) throw new Error('LineNotificationProvider is missing.')
  return repository
}

