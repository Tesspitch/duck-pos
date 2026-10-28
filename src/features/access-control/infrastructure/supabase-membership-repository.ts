import type { MembershipRepository } from '../application/membership-repository'
import type { Membership } from '../domain/membership'
import { supabase } from '../../../lib/supabase'

export const supabaseMembershipRepository: MembershipRepository = {
  async listActiveForUser(userId) {
    const { data, error } = await supabase
      .from('shop_members')
      .select('id, shop_id, user_id, role, status, granted_at, revoked_at, shops(id, name)')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')

    if (error) throw error
    return data as unknown as Membership[]
  },

  async listForShop(shopId) {
    const { data, error } = await supabase
      .from('shop_members')
      .select(
        'id, shop_id, user_id, role, status, granted_at, revoked_at, user_profiles!shop_members_user_id_fkey(display_name, email)',
      )
      .eq('shop_id', shopId)
      .order('granted_at', { ascending: true })

    if (error) throw error
    return data as unknown as Membership[]
  },

  async grant({ shopId, userId, role }) {
    const { error } = await supabase.rpc('grant_shop_member', {
      target_shop_id: shopId,
      target_user_id: userId,
      target_role: role,
    })
    if (error) throw error
  },

  async revoke(shopId, userId) {
    const { error } = await supabase.rpc('revoke_shop_member', {
      target_shop_id: shopId,
      target_user_id: userId,
    })
    if (error) throw error
  },
}

