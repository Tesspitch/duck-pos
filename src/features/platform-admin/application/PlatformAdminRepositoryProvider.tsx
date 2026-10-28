import type { PropsWithChildren } from 'react'

import type { PlatformAdminRepository } from './platform-admin-repository'
import { PlatformAdminRepositoryContext } from './platform-admin-repository-context'

interface PlatformAdminRepositoryProviderProps extends PropsWithChildren {
  repository: PlatformAdminRepository
}

export function PlatformAdminRepositoryProvider({
  children,
  repository,
}: PlatformAdminRepositoryProviderProps) {
  return (
    <PlatformAdminRepositoryContext.Provider value={repository}>
      {children}
    </PlatformAdminRepositoryContext.Provider>
  )
}

