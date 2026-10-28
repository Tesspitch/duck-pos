import { useQuery } from '@tanstack/react-query'

import { useCatalogServices } from './catalog-services-context'

export const catalogQueryKey = (shopId: string) => ['catalog', shopId] as const

export function useCatalog(shopId: string | undefined) {
  const { repository } = useCatalogServices()

  return useQuery({
    queryKey: catalogQueryKey(shopId ?? 'none'),
    enabled: Boolean(shopId),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: () => repository.list(shopId!),
  })
}
