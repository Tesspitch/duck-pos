import type { GrantMembershipInput, Membership } from '../domain/membership'

export interface MembershipRepository {
  listActiveForUser: (userId: string) => Promise<Membership[]>
  listForShop: (shopId: string) => Promise<Membership[]>
  grant: (input: GrantMembershipInput) => Promise<void>
  revoke: (shopId: string, userId: string) => Promise<void>
}

