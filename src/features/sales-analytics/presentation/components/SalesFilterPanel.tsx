import { Icon } from '../../../../shared/presentation/Icon'
import type { FormEvent } from 'react'

import type { SalesHistoryQuery, SalesSessionOption } from '../../domain/sales-report'
import { dateInputValue } from '../../domain/sales-report'

interface Props {
  value: SalesHistoryQuery
  sessions: SalesSessionOption[]
  error: string | null
  onChange: (value: SalesHistoryQuery) => void
  onSubmit: (value: SalesHistoryQuery) => void
}

const selectClass = 'rounded-lg border border-line bg-white px-3'

export function SalesFilterPanel({ value, sessions, error, onChange, onSubmit }: Props) {
  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit(value)
  }

  function set<K extends keyof SalesHistoryQuery>(key: K, next: SalesHistoryQuery[K]) {
    onChange({ ...value, [key]: next, page: 1 })
  }

  function rangeFor(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - (days - 1))
    return { dateFrom:dateInputValue(start), dateTo:dateInputValue(end) }
  }

  function quickRange(days: number) {
    const next = { ...value, ...rangeFor(days), page: 1 }
    onChange(next)
    onSubmit(next)
  }

  return (
    <form onSubmit={submit} className="sales-toolbar rounded-2xl border border-line bg-white p-3 sm:p-4">
      <div className="sales-range-row">
        <label className="grid min-w-0 gap-1 text-xs font-semibold">จากวันที่<input type="date" value={value.dateFrom} onChange={(event) => set('dateFrom', event.target.value)} className={selectClass} /></label>
        <label className="grid min-w-0 gap-1 text-xs font-semibold">ถึงวันที่<input type="date" value={value.dateTo} onChange={(event) => set('dateTo', event.target.value)} className={selectClass} /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="sales-search"><Icon name="search" size={18}/><span className="sr-only">ค้นหาประวัติการขาย</span><input value={value.search} onChange={(event) => set('search', event.target.value)} placeholder="ค้นหาเลขคิว เลขอ้างอิง หรือสินค้า" /></label>
        <div className="pos-chips">
          {([1,7,30] as const).map(days=>{
            const range=rangeFor(days)
            return <button key={days} type="button" aria-pressed={value.dateFrom===range.dateFrom&&value.dateTo===range.dateTo} onClick={()=>quickRange(days)}>{days===1?'วันนี้':`${days} วัน`}</button>
          })}
        </div>
        <button type="submit" className="rounded-xl bg-brand-action px-4 font-bold text-white">แสดงรายงาน</button>
      </div>
      <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><Icon name="settings" size={17}/> ตัวกรองเพิ่มเติม</summary><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-semibold">รอบร้าน<select value={value.storeSessionId ?? ''} onChange={(event) => set('storeSessionId', event.target.value || null)} className={selectClass}><option value="">ทุกรอบ</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.businessDate} · {session.status}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">สรุปตาม<select value={value.bucket} onChange={(event) => set('bucket', event.target.value as SalesHistoryQuery['bucket'])} className={selectClass}><option value="DAY">รายวัน</option><option value="MONTH">รายเดือน</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">ช่องทาง<select value={value.source ?? ''} onChange={(event) => set('source', (event.target.value || null) as SalesHistoryQuery['source'])} className={selectClass}><option value="">ทั้งหมด</option><option value="QR">QR</option><option value="POS">POS</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">สถานะออเดอร์<select value={value.orderStatus ?? ''} onChange={(event) => set('orderStatus', (event.target.value || null) as SalesHistoryQuery['orderStatus'])} className={selectClass}><option value="">ทั้งหมด</option><option value="QUEUED">QUEUED</option><option value="PREPARING">PREPARING</option><option value="READY">READY</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">สถานะชำระ<select value={value.paymentStatus ?? ''} onChange={(event) => set('paymentStatus', (event.target.value || null) as SalesHistoryQuery['paymentStatus'])} className={selectClass}><option value="">ทั้งหมด</option><option value="UNPAID">UNPAID</option><option value="PAID">PAID</option><option value="REFUNDED">REFUNDED</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">วิธีชำระ<select value={value.paymentMethod ?? ''} onChange={(event) => set('paymentMethod', (event.target.value || null) as SalesHistoryQuery['paymentMethod'])} className={selectClass}><option value="">ทั้งหมด</option><option value="CASH">เงินสด</option><option value="BANK_TRANSFER">เงินโอน</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">เรียงตาม<select value={value.sort} onChange={(event) => set('sort', event.target.value as SalesHistoryQuery['sort'])} className={selectClass}><option value="LATEST">ล่าสุด</option><option value="OLDEST">เก่าสุด</option><option value="HIGHEST_AMOUNT">ยอดสูงสุด</option><option value="LOWEST_AMOUNT">ยอดต่ำสุด</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">ต่อหน้า<select value={value.pageSize} onChange={(event) => set('pageSize', Number(event.target.value))} className={selectClass}><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
      </div></details>
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </form>
  )
}
