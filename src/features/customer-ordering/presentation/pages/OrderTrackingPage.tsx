import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useOrderTracking } from '../../application/use-order-tracking'
import type { OrderStatus } from '../../domain/customer-order'
import { CustomerNavigation } from '../components/CustomerNavigation'
import { useCustomerTrackingStore } from '../../application/customer-tracking-store'

const labels: Record<OrderStatus, string> = { QUEUED: 'อยู่ในคิว', PREPARING: 'กำลังเตรียม', READY: 'พร้อมรับอาหาร', COMPLETED: 'รับอาหารแล้ว', CANCELLED: 'ยกเลิกแล้ว' }
const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

export function OrderTrackingPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const remember = useCustomerTrackingStore((state) => state.remember)
  const order = useOrderTracking(token)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const previousStatus = useRef<OrderStatus | null>(null)

  useEffect(() => {
    if (order.data?.shopId && token) remember(order.data.shopId, token)
  }, [order.data?.shopId, token, remember])

  useEffect(() => {
    const status = order.data?.status ?? null
    if (soundEnabled && status === 'READY' && previousStatus.current !== 'READY') {
      const audio = new AudioContext()
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.frequency.value = 880
      gain.gain.value = 0.12
      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start()
      oscillator.stop(audio.currentTime + 0.35)
      oscillator.addEventListener('ended', () => void audio.close())
    }
    previousStatus.current = status
  }, [order.data?.status, soundEnabled])

  if (order.isLoading) return <TrackingMessage text="กำลังโหลดสถานะออเดอร์…" />
  if (order.isError) return <TrackingMessage text="โหลดสถานะไม่สำเร็จ กรุณาลองใหม่" onRetry={() => void order.refetch()} busy={order.isFetching} />
  if (!order.data) return <TrackingMessage text="ไม่พบออเดอร์หรือลิงก์ไม่ถูกต้อง" />
  const ready = order.data.status === 'READY'
  const shopId = order.data.shopId
  return <main className="customer-tracking-page min-h-screen bg-brand-soft p-4"><section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-6 text-center"><p className="text-sm font-semibold text-brand-action">{order.data.shopName}</p><button type="button" onClick={() => setSoundEnabled(true)} disabled={soundEnabled} className="mt-3 min-h-11 rounded-xl border border-line px-3 text-sm font-semibold disabled:bg-brand-soft">{soundEnabled ? ' เปิดเสียงแล้ว' : ' แจ้งเตือนเมื่อพร้อม'}</button><p className="mt-5 text-sm text-muted">เลขคิว</p><h1 className="text-7xl font-black text-brand-action">{String(order.data.queueNumber).padStart(3, '0')}</h1><div className={`mt-5 rounded-2xl p-4 text-xl font-bold ${ready ? 'bg-green-100 text-green-800' : 'bg-brand-soft'}`}>{labels[order.data.status]}</div>{ready ? <p className="mt-3 font-semibold text-green-800">อาหารพร้อมแล้ว กรุณามารับที่เคาน์เตอร์</p> : null}<p className="mt-3 text-sm text-muted">{order.data.orderReference}</p><ul className="mt-6 divide-y divide-line text-left">{order.data.items.map((item, index) => <li key={`${item.name}-${index}`} className="flex justify-between gap-3 py-3"><div><p className="font-semibold">{item.quantity} × {item.name}</p><p className="text-xs text-muted">{item.options.join(', ')}</p></div><p>{money(item.lineTotalSatang)}</p></li>)}</ul><p className="mt-4 text-right text-xl font-bold">รวม {money(order.data.totalSatang)}</p></section>{shopId && token && <CustomerNavigation active="tracking" onMenu={() => navigate(`/order/${shopId}`)} trackingPath={`/track/${token}`} />}</main>
}

function TrackingMessage({ text, onRetry, busy }: { text: string; onRetry?: () => void; busy?: boolean }) {
  return <main className="grid min-h-screen place-items-center bg-brand-soft p-6"><div className="text-center"><p role="status" className="font-semibold">{text}</p>{onRetry && <button type="button" disabled={busy} onClick={onRetry} className="mt-4 min-h-12 bg-brand-action px-5 font-semibold text-white">{busy ? 'กำลังโหลด…' : 'ลองใหม่'}</button>}</div></main>
}
