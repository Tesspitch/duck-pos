export type ShopCreationGrantStatus = 'ACTIVE' | 'CONSUMED' | 'REVOKED'

export interface ShopCreationGrant {
  id: string
  user_id: string
  status: ShopCreationGrantStatus
  granted_at: string
  revoked_at: string | null
  consumed_at: string | null
  created_shop_id: string | null
  user_profiles?: {
    display_name: string | null
    email: string | null
  } | null
}

