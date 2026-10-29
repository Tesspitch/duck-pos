import { supabase } from '../../../lib/supabase'
import type { SalesAnalyticsRepository } from '../application/sales-analytics-repository'
import type { SalesHistoryPage, SalesHistoryQuery } from '../domain/sales-report'

function historyParams(shopId: string, query: SalesHistoryQuery) {
  return {
    target_shop_id: shopId,
    date_from: query.dateFrom,
    date_to: query.dateTo,
    target_store_session_id: query.storeSessionId,
    selected_source: query.source,
    selected_order_status: query.orderStatus,
    selected_payment_status: query.paymentStatus,
    selected_payment_method: query.paymentMethod,
    search_text: query.search,
    sort_mode: query.sort,
    page_number: query.page,
    page_size: query.pageSize,
  }
}

export const supabaseSalesAnalyticsRepository: SalesAnalyticsRepository = {
  async getDashboard(shopId, filter) {
    const { data, error } = await supabase.rpc('get_sales_dashboard', {
      target_shop_id: shopId,
      date_from: filter.dateFrom,
      date_to: filter.dateTo,
      target_store_session_id: filter.storeSessionId,
      bucket_unit: filter.bucket,
    })
    if (error) throw error
    return data
  },
  async getHistory(shopId, query) {
    const { data, error } = await supabase.rpc('search_sales_history', historyParams(shopId, query))
    if (error) throw error
    return data as SalesHistoryPage
  },
  async getAllHistory(shopId, query, limit) {
    const items = []
    const pageSize = 250
    for (let page = 1; items.length < limit; page += 1) {
      const result = await this.getHistory(shopId, { ...query, page, pageSize })
      items.push(...result.items)
      if (items.length >= result.totalCount || result.items.length < pageSize) break
    }
    return items.slice(0, limit)
  },
  async listSessions(shopId) {
    const { data, error } = await supabase.rpc('list_sales_sessions', { target_shop_id: shopId })
    if (error) throw error
    return data
  },
}
