import { createContext, useContext } from 'react'

import type { PlatformAdminRepository } from './platform-admin-repository'

export const PlatformAdminRepositoryContext = createContext<PlatformAdminRepository | null>(null)

export function usePlatformAdminRepository() {
  const repository = useContext(PlatformAdminRepositoryContext)
  if (!repository) {
    throw new Error('usePlatformAdminRepository must be used inside PlatformAdminRepositoryProvider')
  }
  return repository
}

