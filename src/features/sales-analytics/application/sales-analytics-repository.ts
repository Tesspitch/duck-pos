import type { SalesDashboard, SalesDashboardFilter, SalesHistoryItem, SalesHistoryPage, SalesHistoryQuery, SalesSessionOption } from '../domain/sales-report'

export interface SalesAnalyticsRepository {
  getDashboard(shopId: string, filter: SalesDashboardFilter): Promise<SalesDashboard>
  getHistory(shopId: string, query: SalesHistoryQuery): Promise<SalesHistoryPage>
  getAllHistory(shopId: string, query: SalesHistoryQuery, limit: number): Promise<SalesHistoryItem[]>
  listSessions(shopId: string): Promise<SalesSessionOption[]>
}
