import { createContext, useContext } from 'react'

import type { ShopLogoService } from './shop-logo-service'
import type { ShopSettingsRepository } from './shop-settings-repository'

interface ShopSettingsServices {
  repository: ShopSettingsRepository
  logoService: ShopLogoService
}

export const ShopSettingsContext = createContext<ShopSettingsServices | null>(null)

export function useShopSettingsServices() {
  const services = useContext(ShopSettingsContext)
  if (!services) throw new Error('ShopSettingsProvider is missing.')
  return services
}
