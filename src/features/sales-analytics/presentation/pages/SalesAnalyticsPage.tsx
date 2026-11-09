import { Icon } from '../../../../shared/presentation/Icon'
import { formatThaiBaht } from '../../../catalog/domain/money'
import { HistoryDeletionControl } from '../../../history-management/presentation/HistoryDeletionControl'
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

  function applyFilters(next: SalesHistoryQuery) {
    if (validateDateRange(next.dateFrom, next.dateTo)) return
    setApplied({ ...next, page: 1 })
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

    return <AppShell>
    <main className="sales-report-page mx-auto max-w-7xl p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold"><Icon name="chart"/> รายงานยอดขาย</h1><p className="mt-1 text-sm text-muted">{shopName} · ประวัติการขายและรับชำระ</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3"><Icon name="refresh" size={16}/> รีเฟรช</button>
          <button type="button" disabled={csvExport.isPending||history.isFetching||(history.data?.totalCount??0)===0} onClick={()=>csvExport.mutate(applied)} className="rounded-xl bg-brand-action px-3 font-semibold text-white disabled:opacity-40">{csvExport.isPending?'กำลังสร้าง CSV…':'ส่งออก CSV'}</button>
          {activeMembership?.role==='OWNER'&&<HistoryDeletionControl key={shopId} shopId={shopId} shopName={shopName} kind="SALES" dateFrom={applied.dateFrom} dateTo={applied.dateTo}/>}
        </div>
      </header>
      <SalesFilterPanel value={draft} sessions={sessions.data??[]} error={rangeError} onChange={setDraft} onSubmit={applyFilters}/>
      {loadError&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{errorText(loadError)}</p>}
      {csvExport.isSuccess&&<p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">ส่งออก CSV แล้ว {csvExport.data.toLocaleString('th-TH')} รายการ{csvExport.data>=5_000?' (ถึงขีดจำกัด 5,000 รายการ)':''}</p>}
      {csvExport.error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{errorText(csvExport.error)}</p>}
      <section aria-label="สรุปยอดขาย" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label:'รายการที่พบ', value:history.data&&!history.isPlaceholderData?String(history.data.totalCount):'—', tone:'text-ink' },
          { label:'ยอดรับเงินจริง', value:dashboard.data?formatThaiBaht(dashboard.data.netCollectedSalesSatang):'—', tone:'text-brand-action' },
          { label:'ยังไม่ชำระ', value:dashboard.data?String(dashboard.data.unpaidOrders):'—', tone:'text-amber-800' },
          { label:'ยกเลิก', value:dashboard.data?String(dashboard.data.cancelledOrders):'—', tone:'text-red-800' },
        ].map(metric=><div key={metric.label} className="sales-report-metric"><p>{metric.label}</p><strong className={metric.tone}>{metric.value}</strong></div>)}
      </section>
      <p className="text-xs text-muted">ยอดรับเงินจริงและสถานะชำระสรุปตามช่วงวันที่และรอบร้าน</p>
      {history.isPending&&<p role="status" className="rounded-xl border border-line bg-white p-4">กำลังโหลดประวัติการขาย…</p>}
      {history.data&&<SalesHistoryTable page={history.data} isFetching={history.isFetching} onPageChange={changePage}/>}
      {dashboard.data&&<details className="rounded-2xl border border-line bg-white p-4">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold"><Icon name="chart"/> สถิติและกราฟยอดขาย</summary>
        <SalesMetrics dashboard={dashboard.data}/><SalesBreakdown dashboard={dashboard.data}/>
      </details>}
    </main>
  </AppShell>
}
