import { supabase } from '../../../lib/supabase'
import type { StaffOrdersRepository } from '../application/staff-orders-repository'
import type { PaymentResult, PosOrderResult, StaffOrderQueue } from '../domain/staff-order'

export const supabaseStaffOrdersRepository: StaffOrdersRepository = {
  async listActive(shopId) {
    const { data, error } = await supabase.rpc('list_active_staff_orders', { target_shop_id: shopId })
    if (error) throw error
    return data as StaffOrderQueue
  },

  async createPosOrder(input) {
    const { data, error } = await supabase.rpc('create_pos_order', {
      target_shop_id: input.shopId,
      request_idempotency_key: input.idempotencyKey,
      cart_items: input.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        note: line.note,
        optionIds: line.options.map((option) => option.id),
      })),
      order_note: input.note,
    })
    if (error) throw error
    return data as PosOrderResult
  },

  async updateStatus(orderId, expected, next, reason) {
    const { error } = await supabase.rpc('update_order_status', {
      target_order_id: orderId,
      expected_status: expected,
      next_status: next,
      cancellation_reason: reason ?? null,
    })
    if (error) throw error
  },

  async recordPayment(orderId, method, amountReceivedSatang) {
    const { data, error } = await supabase.rpc('record_order_payment', {
      target_order_id: orderId,
      selected_method: method,
      amount_received_satang: amountReceivedSatang,
    })
    if (error) throw error
    return data as PaymentResult
  },
}

