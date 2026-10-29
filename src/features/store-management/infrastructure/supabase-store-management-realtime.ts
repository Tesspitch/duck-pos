import { supabase } from '../../../lib/supabase'
import type { StoreManagementRealtime } from '../application/store-management-realtime'

export const supabaseStoreManagementRealtime: StoreManagementRealtime = {
  subscribe(shopId, onChange) {
    const channel = supabase
      .channel(`store-management:${shopId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'store_sessions', filter: `shop_id=eq.${shopId}`,
      }, onChange)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shopId}`,
      }, onChange)
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  },
}

