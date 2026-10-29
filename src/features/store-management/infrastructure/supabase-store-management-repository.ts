import { supabase } from '../../../lib/supabase'
import type { StoreManagementRepository } from '../application/store-management-repository'
import type { StoreManagement } from '../domain/store-session'

export const supabaseStoreManagementRepository: StoreManagementRepository = {
  async get(shopId) {
    const { data, error } = await supabase.rpc('get_store_management', { target_shop_id: shopId })
    if (error) throw error
    return data as StoreManagement
  },
  async open(shopId) {
    const { error } = await supabase.rpc('open_store_session', { target_shop_id: shopId })
    if (error) throw error
  },
  async close(shopId, sessionId) {
    const { error } = await supabase.rpc('close_store_session', {
      target_shop_id: shopId,
      expected_session_id: sessionId,
    })
    if (error) throw error
  },
}

