import { useState } from 'react'
import { Icon } from '../../../../shared/presentation/Icon'
import { Link } from 'react-router-dom'

import { cancellationSchema } from '../../application/staff-order-schemas'
import type { OrderStatus, PaymentMethod, StaffOrder } from '../../domain/staff-order'
import { PaymentPanel } from './PaymentPanel'
import { QueueOrderItems } from './QueueOrderItems'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`
const labels: Record<OrderStatus, string> = { QUEUED: 'รอทำ', PREPARING: 'กำลังทำ', READY: 'พร้อมรับ', COMPLETED: 'เสร็จแล้ว', CANCELLED: 'ยกเลิก' }

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
  const [paymentOpen, setPaymentOpen] = useState(false)
  const canComplete = ['QUEUED', 'PREPARING', 'READY'].includes(order.status)
  const showPayment = paymentOpen || order.status === 'COMPLETED'
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const created = new Date(order.createdAt)
  const createdTime = Number.isNaN(created.getTime()) ? null : created.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

  function cancel() {
    const result = cancellationSchema.safeParse({ reason })
    if (!result.success) return setCancelError(result.error.issues[0]?.message ?? 'เหตุผลไม่ถูกต้อง')
    onStatus(order.status, 'CANCELLED', result.data.reason)
  }

  return (
    <article className={`queue-ticket state-${order.status.toLowerCase()}`} aria-label={`คิว ${String(order.queueNumber).padStart(3, '0')}`} aria-busy={pending}>
      <header className="queue-ticket-header">
        <div><p className="queue-ticket-label">เลขคิว</p><h2 className="queue-ticket-number">{String(order.queueNumber).padStart(3, '0')}</h2></div>
        <div className="queue-ticket-meta"><span className={`queue-status status-${order.status.toLowerCase()}`}>{labels[order.status]}</span><span>{order.source === 'QR' ? 'สั่งผ่าน QR' : 'หน้าร้าน'}</span>{createdTime && <time dateTime={order.createdAt}><Icon name="clock" size={14} /> {createdTime}</time>}</div>
      </header>
      {order.tableBillId && <Link className="mt-3 flex min-h-12 items-center justify-between border border-brand-action bg-brand-soft px-3 text-lg font-bold text-brand-action" to={`/tables?bill=${order.tableBillId}`}>{order.tableName} <span className="text-sm">บิลโต๊ะ →</span></Link>}
      <div className="queue-ticket-summary"><span>{order.items.length} รายการ · <strong>{quantity} ชิ้น</strong></span><span className={`queue-payment-state ${order.paymentStatus === 'PAID' ? 'paid' : ''}`}>{order.paymentStatus === 'PAID' ? 'ชำระแล้ว' : order.paymentStatus === 'REFUNDED' ? 'คืนเงินแล้ว' : 'ยังไม่ชำระ'}</span></div>
      {order.customerNote && <div className="queue-order-note"><Icon name="message" /><div><strong>หมายเหตุทั้งออเดอร์</strong><p>{order.customerNote}</p></div></div>}
      <QueueOrderItems items={order.items} />
      {canComplete && <div className="queue-ticket-actions">
        <button type="button" disabled={pending} onClick={() => onStatus(order.status, order.status === 'QUEUED' ? 'PREPARING' : 'COMPLETED')} className="queue-primary-action"><Icon name={order.status === 'QUEUED' ? 'play' : 'check'} />{order.status === 'QUEUED' ? 'เริ่มทำ' : 'เสร็จแล้ว'}</button>
        <button type="button" disabled={pending || order.paymentStatus !== 'UNPAID'} aria-expanded={showCancel} onClick={() => setShowCancel((value) => !value)} className="queue-cancel-action">ยกเลิก</button>
      </div>}
      {showCancel && canComplete && order.paymentStatus === 'UNPAID' ? <div className="mt-3 rounded-xl border border-red-200 p-3"><label className="grid gap-1 text-sm">เหตุผลยกเลิก<input disabled={pending} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} className="rounded-lg border border-line px-3" /></label>{cancelError ? <p role="alert" className="mt-1 text-sm text-red-700">{cancelError}</p> : null}<button type="button" disabled={pending} onClick={cancel} className="mt-2 w-full rounded-lg bg-red-700 px-3 font-semibold text-white">ยืนยันยกเลิกออเดอร์</button></div> : null}
      <footer className="queue-ticket-payment">
        <div className="queue-payment-summary"><p><span>ยอดรวม</span><strong>{money(order.totalSatang)}</strong></p>{!order.tableBillId && order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && <button type="button" disabled={pending} aria-expanded={paymentOpen} onClick={() => setPaymentOpen((value) => !value)}>{paymentOpen ? 'ซ่อนรับชำระ' : 'รับชำระ'}<Icon name={paymentOpen ? 'close' : 'arrow'} size={16} /></button>}</div>
        {!order.tableBillId && order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED' && showPayment && <PaymentPanel order={order} pending={pending} onPay={onPay} />}
        <p className="queue-ticket-reference">{order.orderReference}</p>
      </footer>
    </article>
  )
}

