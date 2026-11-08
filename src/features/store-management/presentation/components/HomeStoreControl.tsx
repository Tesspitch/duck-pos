import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCloseStore, useOpenStore, useSetOrderAcceptance, useStoreManagement } from '../../application/use-store-management'
import { canCloseStore } from '../../domain/store-session'
import { LoadingState } from '../../../../shared/presentation/LoadingState'
import { Icon } from '../../../../shared/presentation/Icon'

const actions = {
  open: { label: 'เปิดร้าน', description: 'เริ่มรอบขายและเปิดรับออเดอร์ใหม่' },
  pause: { label: 'พักรับออเดอร์', description: 'พักรับออเดอร์ใหม่ชั่วคราว คิวเดิมยังจัดการต่อได้' },
  resume: { label: 'เปิดรับอีกครั้ง', description: 'กลับมาเปิดรับออเดอร์ใหม่ในรอบขายปัจจุบัน' },
  close: { label: 'ปิดรอบขาย', description: 'จบรอบขายปัจจุบันและหยุดรับออเดอร์ใหม่' },
} as const

export function HomeStoreControl({ shopId }: { shopId: string }) {
  const management = useStoreManagement(shopId)
  const open = useOpenStore(shopId)
  const close = useCloseStore(shopId)
  const acceptance = useSetOrderAcceptance(shopId)
  const client = useQueryClient()
  const [message, setMessage] = useState('')
  const [action, setAction] = useState<keyof typeof actions | null>(null)
  const [confirming, setConfirming] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const actionLock = useRef(false)
  const titleId = useId()
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
    if (latest.error || !latest.data?.activeSession || latest.data.activeSession.id !== data?.activeSession?.id) {
      setMessage('สถานะร้านเปลี่ยนแล้ว กรุณาตรวจสอบอีกครั้ง')
      return
    }
    await acceptance.mutateAsync({ sessionId: latest.data.activeSession.id, accepting })
    setMessage(accepting ? 'กลับมาเปิดรับออเดอร์แล้ว' : 'หยุดรับออเดอร์ใหม่แล้ว คิวเดิมยังจัดการต่อได้')
    await refreshOperationalData()
  }
  async function closeStore() {
    setMessage('')
    const latest = await management.refetch()
    if (latest.error || !latest.data?.activeSession || latest.data.activeSession.id !== data?.activeSession?.id) {
      setMessage('สถานะร้านเปลี่ยนแล้ว กรุณาตรวจสอบอีกครั้ง')
      return
    }
    if (!canCloseStore(latest.data.activeSession)) {
      setMessage('ยังมีออเดอร์หรือโต๊ะค้าง กรุณาเคลียร์ก่อนปิดรอบขาย')
      return
    }
    await close.mutateAsync(latest.data.activeSession.id)
    setMessage('ปิดร้านและจบรอบการขายแล้ว')
    await refreshOperationalData()
  }

  const data = management.data
  const blocked = busy || confirming || management.isError
  const status = !data?.isOpen ? 'ร้านปิด' : data.acceptingOrders ? 'ร้านเปิด · กำลังรับออเดอร์' : 'พักรับออเดอร์อยู่'
  function requestAction(next: keyof typeof actions) {
    setAction(next)
    dialog.current?.showModal()
  }

  async function confirmAction() {
    if (!action || blocked || actionLock.current) return
    actionLock.current = true
    setConfirming(true)
    setMessage('')
    dialog.current?.close()
    try {
      if (action === 'open') await openStore()
      else if (action === 'close') await closeStore()
      else await setAccepting(action === 'resume')
    } catch {
      // The mutation exposes its error in the status card.
    } finally {
      actionLock.current = false
      setConfirming(false)
    }
  }

  return <section className="rounded-2xl border border-line bg-white p-3 sm:p-5" aria-label="สถานะและการเปิดปิดร้าน">
    <h2 className="sr-only">สถานะร้าน</h2>
    {data&&<div className={`flex items-center gap-3 rounded-xl p-3 ${!data.isOpen?'bg-red-50 text-red-800':data.acceptingOrders?'bg-green-50 text-green-800':'bg-amber-50 text-amber-900'}`}><Icon name="store" className="shrink-0"/><div><p className="font-bold">{status}</p><p className="text-xs">{!data.isOpen?'เปิดรอบขายเพื่อเริ่มรับออเดอร์':data.acceptingOrders?'รับออเดอร์ใหม่ได้':'คิวเดิมยังจัดการต่อได้'}</p></div></div>}
    {management.isLoading && <LoadingState label="กำลังตรวจสอบสถานะร้าน…" />}
    {data && <div className="mt-4 grid gap-3">
      {!data.isOpen ? <button type="button" disabled={blocked} onClick={()=>requestAction('open')} className="flex items-center justify-center gap-2 rounded-xl bg-green-800 px-3 font-bold text-white disabled:opacity-50"><Icon name="play" size={18}/>เปิดร้าน</button> : <>
        {data.activeSession&&<div className="grid grid-cols-2 divide-x divide-line rounded-xl bg-[#f1f3f0] text-center"><div className="p-3"><p className="text-xs text-muted">ออเดอร์ค้าง</p><strong className="text-xl">{data.activeSession.pendingOrderCount}</strong></div><div className="p-3"><p className="text-xs text-muted">โต๊ะที่เปิดอยู่</p><strong className="text-xl">{data.activeSession.pendingTableCount??0}</strong></div></div>}
        <div className="flex items-center gap-2 text-xs text-muted"><Icon name="clock" size={15}/>ตรวจสถานะล่าสุด {new Date(management.dataUpdatedAt).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,130px),1fr))] gap-2">
          <button type="button" disabled={blocked||!data.activeSession} onClick={()=>requestAction(data.acceptingOrders?'pause':'resume')} className={`flex items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold disabled:opacity-50 ${data.acceptingOrders?'border-orange-300 bg-brand-soft text-brand-action':'border-green-700 bg-green-800 text-white'}`}><Icon name={data.acceptingOrders?'pause':'play'} size={18}/>{data.acceptingOrders?actions.pause.label:actions.resume.label}</button>
          {canCloseStore(data.activeSession)&&<button type="button" disabled={blocked} onClick={()=>requestAction('close')} className="rounded-xl border border-red-200 px-3 text-sm font-bold text-red-800 disabled:opacity-50">ปิดรอบขาย</button>}
        </div>
        {!canCloseStore(data.activeSession)&&<div className="rounded-xl border border-amber-200 bg-amber-50 px-3 pt-2 text-sm"><p>ก่อนปิดรอบขาย ให้เคลียร์รายการเดิมต่อจนเสร็จ</p><div className="flex flex-wrap gap-x-4">{(data.activeSession?.pendingOrderCount??0)>0&&<Link to="/queue" className="inline-flex min-h-11 items-center font-bold text-brand-action">ไปจัดการคิว →</Link>}{(data.activeSession?.pendingTableCount??0)>0&&<Link to="/tables" className="inline-flex min-h-11 items-center font-bold text-brand-action">ไปจัดการโต๊ะและบิล →</Link>}</div></div>}
      </>}
    </div>}
    {message && <p role="status" className="mt-3 text-sm font-semibold">{message}</p>}
    {error && <div role="alert" className="mt-3 bg-red-50 p-3 text-sm text-red-700"><p>{error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ'}</p><button type="button" onClick={() => void management.refetch()} className="mt-2 underline">ตรวจสอบสถานะอีกครั้ง</button></div>}
    {confirming&&<p role="status" className="mt-3 text-sm text-muted">กำลังเปลี่ยนสถานะร้าน…</p>}
    <dialog ref={dialog} className="confirm-action-dialog store-status-sheet" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-xl font-bold">เปลี่ยนสถานะร้าน</h2>
      {action&&<><p className="mt-3 rounded-lg bg-[#f1f3f0] p-3 text-sm font-semibold">{status}</p><p className="mt-4 font-bold">{actions[action].label}</p><p className="mt-1 text-sm text-muted">{actions[action].description}</p></>}
      <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" className="rounded-lg border border-line font-semibold" onClick={()=>dialog.current?.close()}>ยกเลิก</button><button type="button" disabled={blocked} className={`rounded-lg font-bold text-white disabled:opacity-50 ${action==='close'?'bg-red-700':action==='pause'?'bg-brand-action':'bg-green-800'}`} onClick={()=>void confirmAction()}>ยืนยัน</button></div>
    </dialog>
  </section>
}
