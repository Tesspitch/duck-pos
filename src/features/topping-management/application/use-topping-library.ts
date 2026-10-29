import { useQuery } from '@tanstack/react-query'

import { useToppingLibraryRepository } from './topping-library-context'

export const toppingLibraryQueryKey = (shopId: string) => ['topping-library', shopId] as const

export function useToppingLibrary(shopId: string | undefined) {
  const repository = useToppingLibraryRepository()
  return useQuery({
    queryKey: toppingLibraryQueryKey(shopId ?? 'none'),
    enabled: Boolean(shopId),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: () => repository.get(shopId!),
  })
}
