export interface ShopCreationAccess {
  id: string
  status: 'ACTIVE' | 'CONSUMED' | 'REVOKED'
  created_shop_id: string | null
}

export interface CreateShopInput {
  name: string
  timezone: string
  currencyCode: string
}

