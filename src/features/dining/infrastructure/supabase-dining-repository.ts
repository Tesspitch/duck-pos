import { supabase } from '../../../lib/supabase'
import type { DiningRepository } from '../application/dining-context'
async function rpc(name: string, args: Record<string, unknown>) {
 const { data, error } = await supabase.rpc(name, args)
 if (error) throw error
 return data
}
export const supabaseDiningRepository: DiningRepository = {
 list: (shopId) => rpc('list_dining_tables', { target_shop_id: shopId }),
 create: (shopId,name) => rpc('save_dining_table', { target_shop_id: shopId, table_name: name }),
 archive: (shopId, tableId) => rpc('archive_dining_table', { target_shop_id: shopId, target_table_id: tableId }),
 open: (id) => rpc('open_dining_table', { target_table_id: id }),
 bill: (id) => rpc('get_table_bill', { target_bill_id: id }),
 checkout: (id,freeze) => rpc('set_table_bill_checkout', { target_bill_id: id, checking_out: freeze }),
 close: (id) => rpc('close_dining_table', { target_bill_id: id }),
 pay: (input) => rpc('pay_table_bill', { target_bill_id: input.billId, selected_method: input.method, received_satang: input.receivedSatang, request_id: input.requestId, expected_fingerprint: input.fingerprint }),
 context: (token) => rpc('get_dining_table_context', { table_qr_token: token }),
 track: (token) => rpc('track_table_round', { guest_token: token }),
 cancel: (token,id) => rpc('cancel_table_guest_order', { guest_token: token, target_order_id: id }),
}
