import type { SaveShopBrandingInput, ShopBranding } from '../domain/shop-branding'

export interface ShopSettingsRepository {
  get(shopId: string): Promise<ShopBranding>
  save(input: SaveShopBrandingInput): Promise<ShopBranding>
}
