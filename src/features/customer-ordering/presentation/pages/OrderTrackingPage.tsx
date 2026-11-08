import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../../../shared/presentation/Icon'

import { useOrderTracking } from '../../application/use-order-tracking'
import type { OrderStatus } from '../../domain/customer-order'
import { CustomerNavigation } from '../components/CustomerNavigation'
import { useCustomerTrackingStore } from '../../application/customer-tracking-store'
import { CustomerOrderSwitcher } from '../components/CustomerOrderSwitcher'
import { CancelCustomerOrder } from '../components/CancelCustomerOrder'

const labels: Record<OrderStatus, string> = { QUEUED: 'อยู่ในคิว', PREPARING: 'กำลังทำ', READY: 'พร้อมรับอาหาร', COMPLETED: 'เสร็จแล้ว', CANCELLED: 'ยกเลิกแล้ว' }
const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

function OrderTimeline({status}:{status:OrderStatus}) {
 const steps=[['QUEUED','ส่งออเดอร์สำเร็จ','ระบบรับคำสั่งซื้อแล้ว'],['PREPARING','กำลังทำอาหาร','ร้านกำลังเตรียมรายการของคุณ'],['READY','พร้อมรับ','รับอาหารได้ที่หน้าร้าน'],['COMPLETED','รับอาหารแล้ว','จบรายการ']] as const
 if(status==='CANCELLED')return null
 const current=steps.findIndex(([key])=>key===status)
 return <section className="tracking-progress"><h2 className="font-bold">สถานะคำสั่งซื้อ</h2><ol>{steps.map(([key,label,description],index)=><li key={key} aria-current={current===index?'step':undefined} data-complete={current>index}><span aria-hidden="true">{current>index?'✓':index+1}</span><div><strong>{label}</strong><p className="text-sm text-muted">{description}</p></div></li>)}</ol></section>
}

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
    if (soundEnabled && (status === 'READY' || status === 'COMPLETED')
      && previousStatus.current !== 'READY' && previousStatus.current !== 'COMPLETED') {
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
    const current = order.data
  const {shopId,status}=current
  const finished = status==='COMPLETED'||status==='CANCELLED'
  const ready = status==='READY'||status==='COMPLETED'
  return <main className="customer-tracking-page">
    <header className="customer-tracking-header">
      {shopId&&<button type="button" aria-label="กลับไปหน้าเมนู" onClick={()=>navigate(`/order/${shopId}`)}><Icon name="back"/></button>}
      <h1 className="text-xl font-bold">ติดตามออเดอร์</h1>
    </header>
    <div className="mx-auto grid max-w-xl gap-3 p-4">
      {token&&<CustomerOrderSwitcher shopId={shopId} currentToken={token}/>}
      <section className="customer-tracking-ticket">
        <div className="customer-cooking-icon"><Icon name="cooking" size={52}/></div>
        <p className="mt-3 font-semibold">หมายเลขคิวของคุณ</p>
        <h2 className="customer-queue-number">{String(current.queueNumber).padStart(3,'0')}</h2>
        <p className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold ${ready?'bg-green-100 text-green-800':status==='CANCELLED'?'bg-red-50 text-red-800':'bg-brand-soft text-brand-action'}`}>{labels[status]}</p>
        <p className="mt-3 text-sm text-muted">{status==='READY'?'อาหารพร้อมแล้ว กรุณามารับที่เคาน์เตอร์':finished?current.shopName:'ติดตามสถานะออเดอร์ได้จากหน้านี้'}</p>
        {!finished&&<button type="button" onClick={()=>setSoundEnabled(true)} disabled={soundEnabled} className="mt-2 min-h-11 px-3 text-sm font-semibold text-brand-action">{soundEnabled?' เปิดเสียงแล้ว':' แจ้งเตือนเมื่อเสร็จ'}</button>}
      </section>
      <OrderTimeline status={status}/>
      <section className="pos-summary-card">
        <h2 className="font-bold">รายการอาหาร</h2>
        <p className="break-all text-xs text-muted">{current.orderReference}</p>
        <ul className="mt-2 divide-y divide-line">{current.items.map((item,index)=><li key={`${item.name}-${index}`} className="flex justify-between gap-3 py-3"><div className="min-w-0 break-words"><p className="font-semibold">{item.quantity} × {item.name}</p><p className="text-xs text-muted">{item.options.join(', ')}</p></div><p className="shrink-0">{money(item.lineTotalSatang)}</p></li>)}</ul>
        <p className="mt-2 text-right text-lg font-bold">รวม {money(current.totalSatang)}</p>
        {token&&<CancelCustomerOrder key={token} token={token} order={current}/>}
      </section>
    </div>
    {shopId&&token&&<CustomerNavigation active="tracking" onMenu={()=>navigate(`/order/${shopId}`)} trackingPath={`/track/${token}`}/>}
  </main>
}

function TrackingMessage({ text, onRetry, busy }: { text: string; onRetry?: () => void; busy?: boolean }) {
  return <main className="grid min-h-screen place-items-center bg-brand-soft p-6"><div className="text-center"><p role="status" className="font-semibold">{text}</p>{onRetry && <button type="button" disabled={busy} onClick={onRetry} className="mt-4 min-h-12 bg-brand-action px-5 font-semibold text-white">{busy ? 'กำลังโหลด…' : 'ลองใหม่'}</button>}</div></main>
}
