import { supabase } from '../../../lib/supabase'
import type { StaffOrdersRealtime } from '../application/staff-orders-realtime'

export const supabaseStaffOrdersRealtime: StaffOrdersRealtime = {
  subscribe(shopId, onChange, onConnectionState) {
    onConnectionState('CONNECTING')
    const channel = supabase
      .channel(`staff-orders:${shopId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shopId}`,
      }, onChange)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'payments', filter: `shop_id=eq.${shopId}`,
      }, onChange)
      .subscribe((status) => {
        onConnectionState(status === 'SUBSCRIBED' ? 'CONNECTED' : 'RECONNECTING')
      })

    return () => { void supabase.removeChannel(channel) }
  },
}

