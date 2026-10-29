import { useState } from 'react'

import { AppShell } from '../../../../shared/presentation/AppShell'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useSalesCsvExport, useSalesDashboard, useSalesHistory, useSalesSessions } from '../../application/use-sales-analytics'
import type { SalesHistoryQuery } from '../../domain/sales-report'
import { todaySalesFilter, validateDateRange } from '../../domain/sales-report'
import { SalesBreakdown } from '../components/SalesBreakdown'
import { SalesFilterPanel } from '../components/SalesFilterPanel'
import { SalesHistoryTable } from '../components/SalesHistoryTable'
import { SalesMetrics } from '../components/SalesMetrics'

const initialQuery = (): SalesHistoryQuery => ({
  ...todaySalesFilter(), source: null, orderStatus: null, paymentStatus: null,
  paymentMethod: null, search: '', sort: 'LATEST', page: 1, pageSize: 25,
})
const errorText = (error: unknown) => error instanceof Error ? error.message : 'โหลดรายงานไม่สำเร็จ'

export function SalesAnalyticsPage() {
  const { activeMembership } = useActiveShop()
  const shopId = activeMembership?.shop_id ?? ''
  const shopName = activeMembership?.shops?.name ?? 'shop'
  const [draft, setDraft] = useState<SalesHistoryQuery>(initialQuery)
  const [applied, setApplied] = useState<SalesHistoryQuery>(initialQuery)
  const rangeError = validateDateRange(draft.dateFrom, draft.dateTo)
  const sessions = useSalesSessions(shopId)
  const dashboard = useSalesDashboard(shopId, applied)
  const history = useSalesHistory(shopId, applied)
  const csvExport = useSalesCsvExport(shopId, shopName)

  function applyFilters() {
    if (rangeError) return
    setApplied({ ...draft, page: 1 })
  }

  function changePage(page: number) {
    setApplied((current) => ({ ...current, page }))
    setDraft((current) => ({ ...current, page }))
  }

  function refresh() {
    void dashboard.refetch()
    void history.refetch()
    void sessions.refetch()
  }

  const loadError = dashboard.error ?? history.error ?? sessions.error

  return <AppShell><main className="mx-auto max-w-6xl p-4 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-brand-action">Phase 6 · Owner</p><h1 className="text-2xl font-bold">รายงานยอดขาย</h1><p className="text-sm text-muted">{shopName} · แสดงเฉพาะรายรับและการรับชำระ</p></div><div className="flex gap-2"><button type="button" onClick={refresh} className="rounded-lg border border-line px-3">รีเฟรช</button><button type="button" disabled={csvExport.isPending || (history.data?.totalCount ?? 0) === 0} onClick={() => csvExport.mutate(applied)} className="rounded-lg bg-brand-action px-3 font-semibold text-white disabled:opacity-40">{csvExport.isPending ? 'กำลังสร้าง CSV…' : 'ส่งออก CSV'}</button></div></div><SalesFilterPanel value={draft} sessions={sessions.data ?? []} error={rangeError} onChange={setDraft} onSubmit={applyFilters} />{loadError ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{errorText(loadError)}</p> : null}{csvExport.isSuccess ? <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-green-800">ส่งออก CSV แล้ว {csvExport.data.toLocaleString('th-TH')} รายการ{csvExport.data >= 5_000 ? ' (ถึงขีดจำกัด 5,000 รายการ)' : ''}</p> : null}{csvExport.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{errorText(csvExport.error)}</p> : null}{dashboard.isLoading ? <p className="p-8 text-center">กำลังคำนวณยอดขาย…</p> : null}{dashboard.data ? <><SalesMetrics dashboard={dashboard.data} /><SalesBreakdown dashboard={dashboard.data} /></> : null}{history.data ? <SalesHistoryTable page={history.data} isFetching={history.isFetching} onPageChange={changePage} /> : null}</main></AppShell>
}
