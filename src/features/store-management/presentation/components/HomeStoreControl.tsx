import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCloseStore, useOpenStore, useSetOrderAcceptance, useStoreManagement } from '../../application/use-store-management'
import { canCloseStore } from '../../domain/store-session'
import { SlideConfirm } from '../../../../shared/presentation/SlideConfirm'
import { LoadingState } from '../../../../shared/presentation/LoadingState'

export function HomeStoreControl({ shopId }: { shopId: string }) {
  const management = useStoreManagement(shopId)
  const open = useOpenStore(shopId)
  const close = useCloseStore(shopId)
  const acceptance = useSetOrderAcceptance(shopId)
  const client = useQueryClient()
  const [message, setMessage] = useState('')
  const busy = open.isPending || close.isPending || acceptance.isPending || management.isFetching
  const error = management.error ?? open.error ?? close.error ?? acceptance.error

  async function refreshOperationalData() {
    await Promise.all(['staff-orders', 'public-menu', 'sales-dashboard', 'sales-history'].map((key) => client.invalidateQueries({ queryKey: [key, shopId] })))
  }
  async function openStore() {
    setMessage('')
    await open.mutateAsync()
    setMessage('เปิดรอบขายแล้ว พร้อมรับออเดอร์')
    await refreshOperationalData()
  }
  async function setAccepting(accepting: boolean) {
    const latest = await management.refetch()
    if (!latest.data?.activeSession) return
    await acceptance.mutateAsync({ sessionId: latest.data.activeSession.id, accepting })
    setMessage(accepting ? 'กลับมาเปิดรับออเดอร์แล้ว' : 'หยุดรับออเดอร์ใหม่แล้ว คิวเดิมยังจัดการต่อได้')
    await refreshOperationalData()
  }
  async function closeStore() {
    setMessage('')
    const latest = await management.refetch()
    if (!latest.data?.activeSession) return
    if (!canCloseStore(latest.data.activeSession)) {
      setMessage('ยังมีออเดอร์หรือโต๊ะค้าง กรุณาเคลียร์ก่อนปิดรอบขาย')
      return
    }
    await close.mutateAsync(latest.data.activeSession.id)
    setMessage('ปิดร้านและจบรอบการขายแล้ว')
    await refreshOperationalData()
  }

  const data = management.data
  return <section className="home-store-control" aria-label="สถานะและการเปิดปิดร้าน">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-muted">เริ่มงานที่นี่</p><h2 className="mt-1 text-xl font-bold">สถานะร้าน</h2></div>{data && <span className={`store-state-badge ${data.isOpen ? 'is-open' : 'is-closed'}`}>{data.isOpen ? 'ร้านเปิด' : 'ร้านปิด'}</span>}</div>
    {management.isLoading && <LoadingState label="กำลังตรวจสอบสถานะร้าน…" />}
    {data && <div className="mt-4 grid gap-3">
      {!data.isOpen ? <SlideConfirm intent="open" key={`${shopId}-open`} label="เปิดร้าน" disabled={busy || management.isError} onConfirm={openStore} /> : <>
        <div className={`flex items-center justify-between gap-3 border p-3 ${data.acceptingOrders ? 'border-green-200 bg-green-50' : 'border-amber-300 bg-amber-50'}`}><div><p className="text-xs font-semibold text-muted">การรับออเดอร์</p><p className={`font-bold ${data.acceptingOrders ? 'text-green-800' : 'text-amber-900'}`}>{data.acceptingOrders ? 'กำลังรับออเดอร์' : 'หยุดรับชั่วคราว'}</p></div><button type="button" disabled={busy} onClick={() => void setAccepting(!data.acceptingOrders).catch(() => undefined)} className={`min-h-11 shrink-0 border bg-white px-3 text-sm font-bold ${data.acceptingOrders ? 'border-amber-500 text-amber-900' : 'border-green-700 text-green-800'}`}>{data.acceptingOrders ? 'หยุดรับชั่วคราว' : 'เปิดรับอีกครั้ง'}</button></div>
        {!canCloseStore(data.activeSession) ? <div className="border border-amber-300 bg-amber-50 p-4"><p className="font-semibold">ออเดอร์ค้าง {data.activeSession?.pendingOrderCount ?? 0} รายการ · โต๊ะเปิดอยู่ {data.activeSession?.pendingTableCount ?? 0} โต๊ะ</p><p className="mt-1 text-sm">หยุดรับออเดอร์ใหม่ได้ แล้วเคลียร์รายการเดิมต่อจนเสร็จ</p><Link to={(data.activeSession?.pendingTableCount ?? 0)>0 ? "/tables" : "/queue"} className="mt-2 inline-flex min-h-12 items-center font-bold underline">{(data.activeSession?.pendingTableCount ?? 0)>0 ? "ไปจัดการโต๊ะและบิล →" : "ไปจัดการคิว →"}</Link></div> : <SlideConfirm intent="close" key={`${shopId}-close`} label="ปิดรอบขาย" disabled={busy || management.isError} onConfirm={closeStore} />}
      </>}
    </div>}
    {message && <p role="status" className="mt-3 text-sm font-semibold">{message}</p>}
    {error && <div role="alert" className="mt-3 bg-red-50 p-3 text-sm text-red-700"><p>{error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ'}</p><button type="button" onClick={() => void management.refetch()} className="mt-2 underline">ตรวจสอบสถานะอีกครั้ง</button></div>}
  </section>
}
