import type { CreateShopInput, ShopCreationAccess } from '../domain/shop-creation-access'

export interface ShopOnboardingRepository {
  getAccessForUser: (userId: string) => Promise<ShopCreationAccess | null>
  createShop: (input: CreateShopInput) => Promise<string>
}

