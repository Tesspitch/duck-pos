import type { PropsWithChildren } from 'react'

import type { ToppingLibraryRepository } from './topping-library-repository'
import { ToppingLibraryContext } from './topping-library-context'

export function ToppingLibraryProvider({ children, repository }: PropsWithChildren<{ repository: ToppingLibraryRepository }>) {
  return <ToppingLibraryContext.Provider value={repository}>{children}</ToppingLibraryContext.Provider>
}
