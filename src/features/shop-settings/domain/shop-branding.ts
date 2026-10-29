export interface ShopBranding {
  id: string
  name: string
  timezone: string
  currencyCode: string
  logoPath: string | null
  logoUrl: string | null
}

export interface SaveShopBrandingInput {
  shopId: string
  name: string
  logoPath: string | null
}

export interface ShopLocation {
  latitude: number
  longitude: number
  radiusM: 100
}
