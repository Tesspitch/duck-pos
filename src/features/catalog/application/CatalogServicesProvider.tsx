import type { PropsWithChildren } from 'react'

import type { CatalogImageService } from './catalog-image-service'
import type { CatalogRepository } from './catalog-repository'
import { CatalogServicesContext } from './catalog-services-context'

interface CatalogServicesProviderProps extends PropsWithChildren {
  repository: CatalogRepository
  imageService: CatalogImageService
}

export function CatalogServicesProvider({
  children,
  repository,
  imageService,
}: CatalogServicesProviderProps) {
  return (
    <CatalogServicesContext.Provider value={{ repository, imageService }}>
      {children}
    </CatalogServicesContext.Provider>
  )
}
