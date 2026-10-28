import { createContext, useContext } from 'react'

import type { MembershipRepository } from './membership-repository'

export const MembershipRepositoryContext = createContext<MembershipRepository | null>(null)

export function useMembershipRepository() {
  const repository = useContext(MembershipRepositoryContext)
  if (!repository) {
    throw new Error('useMembershipRepository must be used inside MembershipRepositoryProvider')
  }
  return repository
}

