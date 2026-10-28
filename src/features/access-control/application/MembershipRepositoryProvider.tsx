import type { PropsWithChildren } from 'react'

import type { MembershipRepository } from './membership-repository'
import { MembershipRepositoryContext } from './membership-repository-context'

interface MembershipRepositoryProviderProps extends PropsWithChildren {
  repository: MembershipRepository
}

export function MembershipRepositoryProvider({
  children,
  repository,
}: MembershipRepositoryProviderProps) {
  return (
    <MembershipRepositoryContext.Provider value={repository}>
      {children}
    </MembershipRepositoryContext.Provider>
  )
}

