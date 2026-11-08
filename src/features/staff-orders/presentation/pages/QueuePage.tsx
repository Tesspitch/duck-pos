import { Icon } from '../../../../shared/presentation/Icon'
import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { OrderHistory } from './OrderHistory'
import { LoadingState } from '../../../../shared/presentation/LoadingState'
import { AppShell } from '../../../../shared/presentation/AppShell'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useRecordOrderPayment, useUpdateOrderStatus } from '../../application/use-staff-order-actions'
import { useStaffOrders } from '../../application/use-staff-orders'
import { useStaffOrdersRealtime } from '../../application/use-staff-orders-realtime'
import type { OrderStatus, PaymentMethod } from '../../domain/staff-order'
import { QueueOrderCard } from '../components/QueueOrderCard'

import { QueueConnectionIndicator } from '../components/QueueConnectionIndicator'
const errorText = (error: unknown) => error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'

export function QueuePage() {
  const [params]=useSearchParams()
  if(params.get('view')==='history')return <OrderHistory/>
  if(params.get('view')==='kitchen')return <Navigate to="/queue" replace/>
  return <QueueWorkspace/>
}

function QueueWorkspace() {
  const [filter, setFilter] = useState<OrderStatus | 'ACTIVE' | 'UNPAID'>('ACTIVE')
  const stages = [['QUEUED', 'ใหม่'], ['PREPARING', 'กำลังทำ'], ['READY', 'พร้อมรับ']] as const
  const filters = [['ACTIVE', 'ยังไม่สำเร็จ'], ...stages, ['UNPAID', 'รอรับชำระ']] as const
  const { activeMembership } = useActiveShop()
  const shopId = activeMembership?.shop_id
  const orders = useStaffOrders(shopId)
  const connection = useStaffOrdersRealtime(shopId)
  const statusMutation = useUpdateOrderStatus(shopId ?? '')
  const paymentMutation = useRecordOrderPayment(shopId ?? '')
  const error = statusMutation.error ?? paymentMutation.error
  const activeOrders = (orders.data?.orders ?? []).filter((order) => ['QUEUED', 'PREPARING', 'READY'].includes(order.status))
  const unpaidOrders = (orders.data?.orders ?? []).filter((order) => order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED')
  const unfinishedOrders = (orders.data?.orders ?? []).filter((order) =>
    ['QUEUED', 'PREPARING', 'READY'].includes(order.status)
    || (order.status === 'COMPLETED' && order.paymentStatus === 'UNPAID'))
  const visibleOrders = filter === 'ACTIVE' ? unfinishedOrders
    : filter === 'UNPAID' ? unpaidOrders : activeOrders.filter((order) => order.status === filter)
  function update(orderId: string, expected: OrderStatus, next: OrderStatus, reason?: string) {
    statusMutation.mutate({ orderId, expected, next, reason })
  }

  function pay(orderId: string, method: PaymentMethod, amountReceivedSatang: number) {
    paymentMutation.mutate({ orderId, method, amountReceivedSatang })
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-bold"><Icon name="queue" /> ออเดอร์วันนี้</h1><p className="text-sm text-muted">อัปเดตอัตโนมัติ · {activeMembership?.shops?.name}</p></div>
          <div className="flex gap-2"><QueueConnectionIndicator state={connection} /><button type="button" onClick={() => void orders.refetch()} className="rounded-lg border border-line px-3">รีเฟรช</button></div>
        </div>
        {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{errorText(error)}</p> : null}
        <div className="mt-5 grid grid-cols-3 gap-2">{stages.map(([value,label])=><button key={value} className="pos-metric text-left" onClick={()=>setFilter(value)} aria-pressed={filter===value}><span>{label}</span><strong>{activeOrders.filter(order=>order.status===value).length}</strong></button>)}</div>
        <nav aria-label="กรองสถานะคิว" className="pos-chips mt-4">{filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} <span>{value === 'ACTIVE' ? unfinishedOrders.length : value === 'UNPAID' ? unpaidOrders.length : activeOrders.filter((order) => order.status === value).length}</span></button>)}</nav>
        {orders.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">โหลดคิวไม่สำเร็จ กรุณากดรีเฟรช</p>}
        {orders.isLoading ? <LoadingState label="กำลังโหลดคิว…" /> : null}
        {!orders.isLoading && !orders.error && orders.data && visibleOrders.length === 0 ? <div className="mt-6 rounded-2xl bg-brand-soft p-8 text-center"><p className="text-xl font-bold">{filter === 'ACTIVE' ? 'ไม่มีออเดอร์ค้างแล้ว' : 'ไม่มีออเดอร์ในสถานะนี้'}</p></div> : null}
        <section className="queue-ticket-grid mt-5" aria-label="รายการคิว">
          {visibleOrders.map((order) => (
            <QueueOrderCard
              key={order.id}
              order={order}
              pending={statusMutation.isPending || paymentMutation.isPending}
              onStatus={(expected, next, reason) => update(order.id, expected, next, reason)}
              onPay={(method, amount) => pay(order.id, method, amount)}
            />
          ))}
        </section>
      </main>
    </AppShell>
  )
}

