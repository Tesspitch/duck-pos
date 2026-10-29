import type { PropsWithChildren } from 'react'

import { LineNotificationContext } from './line-notification-context'
import type { LineNotificationRepository } from './line-notification-repository'

interface Props extends PropsWithChildren { repository: LineNotificationRepository }

export function LineNotificationProvider({ children, repository }: Props) {
  return <LineNotificationContext.Provider value={repository}>{children}</LineNotificationContext.Provider>
}

