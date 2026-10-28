import type { PropsWithChildren } from 'react'

import type { ShopLogoService } from './shop-logo-service'
import type { ShopSettingsRepository } from './shop-settings-repository'
import { ShopSettingsContext } from './shop-settings-context'

interface Props extends PropsWithChildren {
  repository: ShopSettingsRepository
  logoService: ShopLogoService
}

export function ShopSettingsProvider({ repository, logoService, children }: Props) {
  return (
    <ShopSettingsContext.Provider value={{ repository, logoService }}>
      {children}
    </ShopSettingsContext.Provider>
  )
}
