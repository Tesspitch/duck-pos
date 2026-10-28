import { createContext, useContext } from 'react'

import type { ProfileRepository } from './profile-repository'

export const ProfileRepositoryContext = createContext<ProfileRepository | null>(null)

export function useProfileRepository() {
  const repository = useContext(ProfileRepositoryContext)
  if (!repository) throw new Error('ProfileRepositoryProvider is missing.')
  return repository
}
