import type { SaveShopBrandingInput, ShopBranding, ShopLocation } from '../domain/shop-branding'

export interface ShopSettingsRepository {
  get(shopId: string): Promise<ShopBranding>
  save(input: SaveShopBrandingInput): Promise<ShopBranding>
  getLocation(shopId: string): Promise<ShopLocation | null>
  saveLocation(shopId: string, latitude: number, longitude: number): Promise<ShopLocation>
}
