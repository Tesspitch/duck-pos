import type { ShopCreationGrant } from '../domain/shop-creation-grant'

export interface PlatformAdminRepository {
  isPlatformAdmin: (userId: string) => Promise<boolean>
  listShopCreationGrants: () => Promise<ShopCreationGrant[]>
  grantShopCreation: (userId: string) => Promise<void>
  revokeShopCreation: (userId: string) => Promise<void>
  listShops: (search: string, offset: number) => Promise<{ shops: Array<{ id: string; name: string }>; hasMore: boolean }>
  deleteShop: (shopId: string, confirmationName: string) => Promise<void>
}

