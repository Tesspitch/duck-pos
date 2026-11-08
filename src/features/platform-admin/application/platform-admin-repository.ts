import type { ShopCreationGrant } from '../domain/shop-creation-grant'
import type { PlatformShop } from '../domain/platform-shop'

export interface PlatformShopStaff { userId: string; name: string | null; email: string | null }

export interface PlatformAdminRepository {
  isPlatformAdmin: (userId: string) => Promise<boolean>
  listShopCreationGrants: () => Promise<ShopCreationGrant[]>
  grantShopCreation: (userId: string) => Promise<void>
  revokeShopCreation: (userId: string) => Promise<void>
  listShops: (search: string, offset: number) => Promise<{ shops: PlatformShop[]; hasMore: boolean }>
  closeShop: (shopId: string, sessionId: string) => Promise<void>
  pauseShop: (shopId: string, sessionId: string) => Promise<void>
  deleteShop: (shopId: string, confirmationName: string) => Promise<void>
  listShopStaff: (shopId: string) => Promise<PlatformShopStaff[]>
  setShopStaff: (shopId: string, userId: string, active: boolean) => Promise<void>
}

