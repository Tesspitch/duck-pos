import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import type { SalesDashboardFilter, SalesHistoryQuery } from '../domain/sales-report'
import { useSalesAnalyticsServices } from './sales-analytics-context'

export function useSalesDashboard(shopId: string | undefined, filter: SalesDashboardFilter) {
  const { repository } = useSalesAnalyticsServices()
  return useQuery({
    queryKey: ['sales-dashboard', shopId ?? 'none', filter],
    enabled: Boolean(shopId),
    queryFn: () => repository.getDashboard(shopId!, filter),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  })
}

export function useSalesHistory(shopId: string | undefined, query: SalesHistoryQuery) {
  const { repository } = useSalesAnalyticsServices()
  return useQuery({
    queryKey: ['sales-history', shopId ?? 'none', query],
    enabled: Boolean(shopId),
    queryFn: () => repository.getHistory(shopId!, query),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  })
}

export function useSalesSessions(shopId: string | undefined) {
  const { repository } = useSalesAnalyticsServices()
  return useQuery({
    queryKey: ['sales-sessions', shopId ?? 'none'],
    enabled: Boolean(shopId),
    queryFn: () => repository.listSessions(shopId!),
    staleTime: 5 * 60_000,
  })
}

export function useSalesCsvExport(shopId: string, shopName: string) {
  const { repository, csvExporter } = useSalesAnalyticsServices()
  return useMutation({
    mutationFn: async (query: SalesHistoryQuery) => {
      const items = await repository.getAllHistory(shopId, query, 5_000)
      const safeName = shopName.replace(/[^a-zA-Z0-9ก-๙_-]+/g, '-')
      csvExporter.export(items, `duckpos-${safeName}-${query.dateFrom}-${query.dateTo}.csv`)
      return items.length
    },
  })
}
