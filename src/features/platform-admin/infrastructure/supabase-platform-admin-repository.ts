import type { PlatformAdminRepository } from '../application/platform-admin-repository'
import type { ShopCreationGrant } from '../domain/shop-creation-grant'
import { supabase } from '../../../lib/supabase'

export const supabasePlatformAdminRepository: PlatformAdminRepository = {
  async isPlatformAdmin(userId) {
    const { data, error } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return Boolean(data)
  },

  async listShopCreationGrants() {
    const { data, error } = await supabase
      .from('shop_creation_grants')
      .select(
        'id, user_id, status, granted_at, revoked_at, consumed_at, created_shop_id, user_profiles!shop_creation_grants_user_id_fkey(display_name, email)',
      )
      .order('granted_at', { ascending: false })

    if (error) throw error
    return data as unknown as ShopCreationGrant[]
  },

  async grantShopCreation(userId) {
    const { error } = await supabase.rpc('grant_shop_creation', {
      target_user_id: userId,
    })
    if (error) throw error
  },

  async revokeShopCreation(userId) {
    const { error } = await supabase.rpc('revoke_shop_creation', {
      target_user_id: userId,
    })
    if (error) throw error
  },
}

