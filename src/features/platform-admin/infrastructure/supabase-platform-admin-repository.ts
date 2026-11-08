import type { PlatformAdminRepository } from '../application/platform-admin-repository'
import type { ShopCreationGrant } from '../domain/shop-creation-grant'
import { supabase } from '../../../lib/supabase'

export const supabasePlatformAdminRepository: PlatformAdminRepository = {
  async listShopStaff(shopId) {
    const { data, error } = await supabase.rpc('list_platform_shop_staff', { target_shop_id: shopId })
    if (error) throw error
    return data
  },
  async setShopStaff(shopId, userId, active) {
    const { error } = await supabase.rpc('set_platform_shop_staff', { target_shop_id: shopId, target_user_id: userId, active })
    if (error) throw error
  },
  async closeShop(shopId, sessionId) {
    const { error } = await supabase.rpc('close_store_session', { target_shop_id: shopId, expected_session_id: sessionId })
    if (error) throw error
  },
  async pauseShop(shopId, sessionId) {
    const { error } = await supabase.rpc('set_store_order_acceptance', { target_shop_id: shopId, expected_session_id: sessionId, accept_new_orders: false })
    if (error) throw error
  },
  async listShops(search, offset) {
    const { data, error } = await supabase.rpc('list_platform_shops', { search_text: search, page_offset: offset })
    if (error) throw error
    return data
  },
  async deleteShop(shopId, confirmationName) {
    const { error } = await supabase.rpc('delete_platform_shop', { target_shop_id: shopId, confirmation_name: confirmationName })
    if (error) throw error
  },
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

