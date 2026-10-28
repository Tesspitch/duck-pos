export type ShopRole = 'OWNER' | 'STAFF'
export type MembershipStatus = 'ACTIVE' | 'REVOKED'

export interface Membership {
  id: string
  shop_id: string
  user_id: string
  role: ShopRole
  status: MembershipStatus
  granted_at: string
  revoked_at: string | null
  shops?: {
    id: string
    name: string
  } | null
  user_profiles?: {
    display_name: string | null
    email: string | null
  } | null
}

export interface GrantMembershipInput {
  shopId: string
  userId: string
  role: ShopRole
}

