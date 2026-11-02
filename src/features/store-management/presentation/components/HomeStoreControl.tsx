import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCloseStore, useOpenStore, useStoreManagement } from '../../application/use-store-management'
import { canCloseStore } from '../../domain/store-session'
import { SlideConfirm } from '../../../../shared/presentation/SlideConfirm'
import { LoadingState } from '../../../../shared/presentation/LoadingState'

export function HomeStoreControl({ shopId, allowClose = true }: { shopId: string; allowClose?: boolean }) {
  const management = useStoreManagement(shopId)
  const open = useOpenStore(shopId)
  const close = useCloseStore(shopId)
  const client = useQueryClient()
  const [message, setMessage] = useState('')
  const busy = open.isPending || close.isPending || management.isFetching
  const error = management.error ?? open.error ?? close.error

  async function execute() {
    setMessage('')
    // Revalidate immediately before a state-changing action. RPC enforces the final rules atomically.
    const latest = await management.refetch()
    if (latest.error || !latest.data) return
    if (latest.data.isOpen !== management.data?.isOpen) {
      setMessage('สถานะร้านเปลี่ยนจากอุปกรณ์อื่น กรุณาตรวจสอบแล้วทำรายการอีกครั้ง')
      return
    }
    if (latest.data.isOpen) {
      if (!allowClose) return
      if (!canCloseStore(latest.data.activeSession)) { setMessage('ยังมีออเดอร์ค้าง กรุณาจัดการคิวก่อนปิดร้าน'); return }
      await close.mutateAsync(latest.data.activeSession!.id)
      setMessage('ปิดร้านและจบรอบการขายแล้ว')
    } else { await open.mutateAsync(); setMessage('เปิดร้านแล้ว พร้อมรับออเดอร์') }
    await Promise.all(['staff-orders', 'public-menu', 'sales-dashboard', 'sales-history'].map((key) => client.invalidateQueries({ queryKey: [key, shopId] })))
  }

  return <section className="home-store-control" aria-label="สถานะและการเปิดปิดร้าน">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-muted">เริ่มงานที่นี่</p><h2 className="mt-1 text-xl font-bold">สถานะร้าน</h2></div>{management.data && <span className={`border px-3 py-2 text-sm font-bold ${management.data.isOpen ? 'border-green-200 bg-green-50 text-green-800' : 'border-line bg-gray-50 text-muted'}`}>{management.data.isOpen ? 'เปิดรับออเดอร์' : 'ปิดรับออเดอร์'}</span>}</div>
    {management.isLoading && <LoadingState label="กำลังตรวจสอบสถานะร้าน…" />}
    {management.data && <div className="mt-4">
      {management.data.isOpen && !allowClose ? <Link to="/pos" className="inline-flex min-h-12 items-center bg-brand-action px-4 font-semibold text-white">ไปรับออเดอร์ →</Link> : management.data.isOpen && !canCloseStore(management.data.activeSession) ? <div className="border border-amber-200 bg-amber-50 p-4"><p className="font-semibold">มีออเดอร์ค้าง {management.data.activeSession?.pendingOrderCount ?? 0} รายการ</p><Link to="/queue" className="mt-2 inline-flex min-h-12 items-center font-bold underline">จัดการคิวก่อนปิดร้าน →</Link></div> : <SlideConfirm key={`${shopId}-${management.data.isOpen}`} label={management.data.isOpen ? 'ปิดร้าน' : 'เปิดร้าน'} disabled={busy || management.isError} onConfirm={execute} />}
    </div>}
    {message && <p role="status" className="mt-3 text-sm font-semibold">{message}</p>}
    {error && <div role="alert" className="mt-3 bg-red-50 p-3 text-sm text-red-700"><p>{error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ'}</p><button type="button" onClick={() => void management.refetch()} className="mt-2 underline">ตรวจสอบสถานะอีกครั้ง</button></div>}
  </section>
}
