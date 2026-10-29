import { createContext, useContext } from 'react'

import type { ToppingLibraryRepository } from './topping-library-repository'

export const ToppingLibraryContext = createContext<ToppingLibraryRepository | null>(null)

export function useToppingLibraryRepository() {
  const repository = useContext(ToppingLibraryContext)
  if (!repository) throw new Error('ToppingLibraryProvider is missing.')
  return repository
}
