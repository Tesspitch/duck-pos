import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useCustomerOrderingRepository } from '../../application/customer-ordering-context'
import { useCustomerTrackingStore } from '../../application/customer-tracking-store'

export function CustomerOrderSwitcher({ shopId, currentToken }: { shopId: string; currentToken: string }) {
  const history = useCustomerTrackingStore((state) => state.historyByShop[shopId])
  const repository = useCustomerOrderingRepository()
  const tokens = history?.includes(currentToken) ? history : [...new Set([currentToken, ...(history ?? [])])]
  const orders = useQueries({ queries: tokens.map((token) => ({
    queryKey: ['customer-order-tracking', token],
    queryFn: () => repository.track(token),
    enabled: tokens.length > 1 && token !== currentToken,
    staleTime: 30_000,
    // Only the selected order polls, through useOrderTracking.
    refetchInterval: false as const,
  })) })
  if (tokens.length < 2) return null
  return <section className="mx-auto mb-4 max-w-xl" aria-label="ออเดอร์ของคุณ">
    <h2 className="mb-2 text-sm font-bold">ออเดอร์ของคุณ · {tokens.length}</h2>
    <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="เลือกออเดอร์">
      {tokens.map((token, index) => {
        const order = orders[index]
        if (order?.data && order.data.shopId !== shopId) return null
        return <Link key={token} to={`/track/${token}`} aria-current={token === currentToken ? 'page' : undefined}
          aria-label={order?.data ? `คิว ${String(order.data.queueNumber).padStart(3, '0')} ${order.data.orderReference}` : undefined}
          className={`inline-flex min-h-12 shrink-0 flex-col justify-center border px-4 py-2 ${token === currentToken ? 'border-brand-action bg-white text-brand-action' : 'border-line bg-white text-ink'}`}>
          <strong>{order?.data ? `คิว ${String(order.data.queueNumber).padStart(3, '0')}` : order?.isError ? 'โหลดรายการไม่สำเร็จ' : order?.data === null ? 'ไม่พบรายการ' : 'กำลังโหลด…'}</strong>
          {order?.data && <span className="text-xs text-muted">{order.data.orderReference}</span>}
        </Link>
      })}
    </nav>
  </section>
}
