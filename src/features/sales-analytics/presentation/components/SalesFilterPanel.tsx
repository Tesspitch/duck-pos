import type { FormEvent } from 'react'

import type { SalesHistoryQuery, SalesSessionOption } from '../../domain/sales-report'

interface Props {
  value: SalesHistoryQuery
  sessions: SalesSessionOption[]
  error: string | null
  onChange: (value: SalesHistoryQuery) => void
  onSubmit: () => void
}

const selectClass = 'rounded-lg border border-line bg-white px-3'

export function SalesFilterPanel({ value, sessions, error, onChange, onSubmit }: Props) {
  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  function set<K extends keyof SalesHistoryQuery>(key: K, next: SalesHistoryQuery[K]) {
    onChange({ ...value, [key]: next, page: 1 })
  }

  function quickRange(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - (days - 1))
    const local = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    onChange({ ...value, dateFrom: local(start), dateTo: local(end), page: 1 })
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-line bg-brand-soft p-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => quickRange(1)} className="rounded-lg border border-line bg-white px-3 text-sm font-semibold">วันนี้</button>
        <button type="button" onClick={() => quickRange(7)} className="rounded-lg border border-line bg-white px-3 text-sm font-semibold">7 วัน</button>
        <button type="button" onClick={() => quickRange(30)} className="rounded-lg border border-line bg-white px-3 text-sm font-semibold">30 วัน</button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-semibold">จากวันที่<input type="date" value={value.dateFrom} onChange={(event) => set('dateFrom', event.target.value)} className={selectClass} /></label>
        <label className="grid gap-1 text-sm font-semibold">ถึงวันที่<input type="date" value={value.dateTo} onChange={(event) => set('dateTo', event.target.value)} className={selectClass} /></label>
        <label className="grid gap-1 text-sm font-semibold">รอบร้าน<select value={value.storeSessionId ?? ''} onChange={(event) => set('storeSessionId', event.target.value || null)} className={selectClass}><option value="">ทุกรอบ</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.businessDate} · {session.status}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">สรุปตาม<select value={value.bucket} onChange={(event) => set('bucket', event.target.value as SalesHistoryQuery['bucket'])} className={selectClass}><option value="DAY">รายวัน</option><option value="MONTH">รายเดือน</option></select></label>
        <label className="grid gap-1 text-sm font-semibold sm:col-span-2">ค้นหา<input value={value.search} onChange={(event) => set('search', event.target.value)} placeholder="เลขอ้างอิง เลขคิว หรือชื่อสินค้า" className={selectClass} /></label>
        <label className="grid gap-1 text-sm font-semibold">ช่องทาง<select value={value.source ?? ''} onChange={(event) => set('source', (event.target.value || null) as SalesHistoryQuery['source'])} className={selectClass}><option value="">ทั้งหมด</option><option value="QR">QR</option><option value="POS">POS</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">สถานะออเดอร์<select value={value.orderStatus ?? ''} onChange={(event) => set('orderStatus', (event.target.value || null) as SalesHistoryQuery['orderStatus'])} className={selectClass}><option value="">ทั้งหมด</option><option value="QUEUED">QUEUED</option><option value="PREPARING">PREPARING</option><option value="READY">READY</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">สถานะชำระ<select value={value.paymentStatus ?? ''} onChange={(event) => set('paymentStatus', (event.target.value || null) as SalesHistoryQuery['paymentStatus'])} className={selectClass}><option value="">ทั้งหมด</option><option value="UNPAID">UNPAID</option><option value="PAID">PAID</option><option value="REFUNDED">REFUNDED</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">วิธีชำระ<select value={value.paymentMethod ?? ''} onChange={(event) => set('paymentMethod', (event.target.value || null) as SalesHistoryQuery['paymentMethod'])} className={selectClass}><option value="">ทั้งหมด</option><option value="CASH">เงินสด</option><option value="BANK_TRANSFER">เงินโอน</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">เรียงตาม<select value={value.sort} onChange={(event) => set('sort', event.target.value as SalesHistoryQuery['sort'])} className={selectClass}><option value="LATEST">ล่าสุด</option><option value="OLDEST">เก่าสุด</option><option value="HIGHEST_AMOUNT">ยอดสูงสุด</option><option value="LOWEST_AMOUNT">ยอดต่ำสุด</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">ต่อหน้า<select value={value.pageSize} onChange={(event) => set('pageSize', Number(event.target.value))} className={selectClass}><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <button type="submit" className="mt-4 w-full rounded-xl bg-brand-action px-4 font-bold text-white sm:w-auto">แสดงรายงาน</button>
    </form>
  )
}
