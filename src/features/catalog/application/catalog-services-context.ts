import { createContext, useContext } from 'react'

import type { CatalogImageService } from './catalog-image-service'
import type { CatalogRepository } from './catalog-repository'

interface CatalogServices {
  repository: CatalogRepository
  imageService: CatalogImageService
}

export const CatalogServicesContext = createContext<CatalogServices | null>(null)

export function useCatalogServices() {
  const services = useContext(CatalogServicesContext)
  if (!services) throw new Error('CatalogServicesProvider is missing.')
  return services
}
