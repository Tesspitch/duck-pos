import type { PropsWithChildren } from 'react'

import type { ProfileRepository } from './profile-repository'
import { ProfileRepositoryContext } from './profile-repository-context'

interface Props extends PropsWithChildren {
  repository: ProfileRepository
}

export function ProfileRepositoryProvider({ repository, children }: Props) {
  return (
    <ProfileRepositoryContext.Provider value={repository}>
      {children}
    </ProfileRepositoryContext.Provider>
  )
}
