import type { PropsWithChildren } from 'react'

import type { ShopLogoService } from './shop-logo-service'
import type { ShopLocationCaptureService } from './shop-location-capture-service'
import type { ShopSettingsRepository } from './shop-settings-repository'
import { ShopSettingsContext } from './shop-settings-context'

interface Props extends PropsWithChildren {
  repository: ShopSettingsRepository
  logoService: ShopLogoService
  locationCaptureService: ShopLocationCaptureService
}

export function ShopSettingsProvider({ repository, logoService, locationCaptureService, children }: Props) {
  return (
    <ShopSettingsContext.Provider value={{ repository, logoService, locationCaptureService }}>
      {children}
    </ShopSettingsContext.Provider>
  )
}
