import { AppShell } from '../../../../shared/presentation/AppShell'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useRecordOrderPayment, useUpdateOrderStatus } from '../../application/use-staff-order-actions'
import { useStaffOrders } from '../../application/use-staff-orders'
import { useStaffOrdersRealtime } from '../../application/use-staff-orders-realtime'
import type { OrderStatus, PaymentMethod } from '../../domain/staff-order'
import { QueueOrderCard } from '../components/QueueOrderCard'

const connectionLabels = { CONNECTING: 'กำลังเชื่อมต่อ', CONNECTED: 'Realtime พร้อม', RECONNECTING: 'กำลังเชื่อมต่อใหม่' }
const errorText = (error: unknown) => error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'

export function QueuePage() {
  const { activeMembership } = useActiveShop()
  const shopId = activeMembership?.shop_id
  const orders = useStaffOrders(shopId)
  const connection = useStaffOrdersRealtime(shopId)
  const statusMutation = useUpdateOrderStatus(shopId ?? '')
  const paymentMutation = useRecordOrderPayment(shopId ?? '')
  const error = statusMutation.error ?? paymentMutation.error

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
          <div><p className="text-sm font-semibold text-brand-action">Phase 4 · Queue</p><h1 className="text-2xl font-bold">คิวออเดอร์</h1><p className="text-sm text-muted">คิวใหม่อยู่ด้านบน · {activeMembership?.shops?.name}</p></div>
          <div className="flex gap-2"><span className={`rounded-full px-3 py-2 text-sm font-semibold ${connection === 'CONNECTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>{connectionLabels[connection]}</span><button type="button" onClick={() => void orders.refetch()} className="rounded-lg border border-line px-3">รีเฟรช</button></div>
        </div>
        {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{errorText(error)}</p> : null}
        {orders.isLoading ? <p className="p-8 text-center">กำลังโหลดคิว…</p> : null}
        {!orders.isLoading && orders.data?.orders.length === 0 ? <div className="mt-6 rounded-2xl bg-brand-soft p-8 text-center"><p className="text-xl font-bold">ยังไม่มีออเดอร์ในคิว</p></div> : null}
        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.data?.orders.map((order) => <QueueOrderCard key={order.id} order={order} pending={statusMutation.isPending || paymentMutation.isPending} onStatus={(expected, next, reason) => update(order.id, expected, next, reason)} onPay={(method, amount) => pay(order.id, method, amount)} />)}
        </section>
      </main>
    </AppShell>
  )
}

