import { supabase } from '../../../lib/supabase'
import type { LineNotificationRepository } from '../application/line-notification-repository'
import type { LineNotificationManagement } from '../domain/line-notification'

export const supabaseLineNotificationRepository: LineNotificationRepository = {
  async getManagement(shopId) {
    const { data, error } = await supabase.rpc('get_line_notification_management', { target_shop_id: shopId })
    if (error) throw error
    return data as LineNotificationManagement
  },
  async updateSettings(shopId, settings) {
    const { data, error } = await supabase.rpc('update_line_notification_settings', {
      target_shop_id: shopId,
      enable_closing_report: settings.closingReportEnabled,
      enable_periodic_report: settings.periodicReportEnabled,
      selected_report_times: settings.reportTimes,
    })
    if (error) throw error
    return data as LineNotificationManagement
  },
  async setSubscriptionStatus(shopId, subscriptionId, status) {
    const { error } = await supabase.rpc('set_line_subscription_status', {
      target_shop_id: shopId,
      target_subscription_id: subscriptionId,
      next_status: status,
    })
    if (error) throw error
  },
}

