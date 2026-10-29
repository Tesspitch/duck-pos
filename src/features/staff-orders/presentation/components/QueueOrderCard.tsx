import { useState } from 'react'

import { cancellationSchema } from '../../application/staff-order-schemas'
import type { OrderStatus, PaymentMethod, StaffOrder } from '../../domain/staff-order'
import { PaymentPanel } from './PaymentPanel'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`
const labels: Record<OrderStatus, string> = { QUEUED: 'รอทำ', PREPARING: 'กำลังทำ', READY: 'พร้อมรับ', COMPLETED: 'เสร็จสิ้น', CANCELLED: 'ยกเลิก' }
const next: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  QUEUED: { status: 'PREPARING', label: 'เริ่มทำ' },
  PREPARING: { status: 'READY', label: 'อาหารพร้อม' },
  READY: { status: 'COMPLETED', label: 'ปิดรายการ' },
}

interface Props {
  order: StaffOrder
  pending: boolean
  onStatus: (expected: OrderStatus, status: OrderStatus, reason?: string) => void
  onPay: (method: PaymentMethod, amount: number) => void
}

export function QueueOrderCard({ order, pending, onStatus, onPay }: Props) {
  const [showCancel, setShowCancel] = useState(false)
  const [reason, setReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const action = next[order.status]

  function cancel() {
    const result = cancellationSchema.safeParse({ reason })
    if (!result.success) return setCancelError(result.error.issues[0]?.message ?? 'เหตุผลไม่ถูกต้อง')
    onStatus(order.status, 'CANCELLED', result.data.reason)
  }

  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm text-muted">คิว</p><p className="text-5xl font-black text-brand-action">{String(order.queueNumber).padStart(3, '0')}</p></div>
        <div className="text-right"><p className="font-bold">{labels[order.status]}</p><p className="text-sm text-muted">{order.source} · {order.orderReference}</p><p className="text-sm">{order.paymentStatus === 'PAID' ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}</p></div>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {order.items.map((item) => <li key={item.id} className="py-2 text-sm"><div className="flex justify-between gap-2"><strong>{item.quantity} × {item.name}</strong><span>{money(item.lineTotalSatang)}</span></div>{item.options.length ? <p className="text-muted">{item.options.join(', ')}</p> : null}{item.note ? <p className="text-red-700">หมายเหตุ: {item.note}</p> : null}</li>)}
      </ul>
      {order.customerNote ? <p className="mt-2 rounded-lg bg-yellow-50 p-2 text-sm">หมายเหตุออเดอร์: {order.customerNote}</p> : null}
      <p className="mt-3 text-right text-xl font-bold">รวม {money(order.totalSatang)}</p>
      {order.paymentStatus === 'UNPAID' ? <PaymentPanel order={order} pending={pending} onPay={onPay} /> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {action ? <button type="button" disabled={pending || (action.status === 'COMPLETED' && order.paymentStatus !== 'PAID')}
          onClick={() => onStatus(order.status, action.status)} className="rounded-xl bg-brand-action px-3 font-semibold text-white disabled:opacity-50">{action.label}</button> : null}
        <button type="button" disabled={pending || order.paymentStatus !== 'UNPAID'} onClick={() => setShowCancel((value) => !value)} className="rounded-xl border border-red-200 px-3 font-semibold text-red-700 disabled:opacity-50">ยกเลิก</button>
      </div>
      {showCancel ? <div className="mt-3 rounded-xl border border-red-200 p-3"><label className="grid gap-1 text-sm">เหตุผลยกเลิก<input value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} className="rounded-lg border border-line px-3" /></label>{cancelError ? <p className="mt-1 text-sm text-red-700">{cancelError}</p> : null}<button type="button" disabled={pending} onClick={cancel} className="mt-2 w-full rounded-lg bg-red-700 px-3 font-semibold text-white">ยืนยันยกเลิกออเดอร์</button></div> : null}
    </article>
  )
}

