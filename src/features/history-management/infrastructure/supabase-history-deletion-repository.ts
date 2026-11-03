import { supabase } from '../../../lib/supabase'
import type { HistoryDeletionRepository } from '../application/history-deletion-context'
import type { HistoryRange } from '../domain/history-deletion'

const params = (range: HistoryRange) => ({ target_shop_id: range.shopId, history_kind: range.kind, date_from: range.dateFrom, date_to: range.dateTo })
export const supabaseHistoryDeletionRepository: HistoryDeletionRepository = {
  async preview(range) {
    const { data, error } = await supabase.rpc('preview_shop_history_deletion', params(range))
    if (error) throw error
    return data
  },
  async remove(input) {
    const { data, error } = await supabase.rpc('delete_shop_history', { ...params(input), expected_fingerprint: input.fingerprint, confirmation_name: input.confirmationName })
    if (error) throw error
    return data
  },
  async previewOrder(target) {
    const { data, error } = await supabase.rpc('preview_shop_order_deletion', { target_shop_id: target.shopId, target_order_id: target.orderId })
    if (error) throw error
    return data
  },
  async removeOrder(input) {
    const { data, error } = await supabase.rpc('delete_shop_order_history', {
      target_shop_id: input.shopId,
      target_order_id: input.orderId,
      expected_fingerprint: input.fingerprint,
      confirmation_name: input.confirmationName,
    })
    if (error) throw error
    return data
  },
}
