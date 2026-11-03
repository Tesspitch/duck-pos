import { Icon } from '../../../../shared/presentation/Icon'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AppShell } from '../../../../shared/presentation/AppShell'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useCloseStore, useOpenStore, useSetOrderAcceptance, useStoreManagement } from '../../application/use-store-management'
import { canCloseStore } from '../../domain/store-session'
import { StoreSessionHistory } from '../components/StoreSessionHistory'

const dateTime = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const errorText = (error: unknown) => error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ'

export function StoreManagementPage() {
  const { activeMembership } = useActiveShop()
  const shopId = activeMembership?.shop_id ?? ''
  const management = useStoreManagement(shopId)
  const openStore = useOpenStore(shopId)
  const closeStore = useCloseStore(shopId)
  const acceptance = useSetOrderAcceptance(shopId)
  const [confirmAction, setConfirmAction] = useState<'OPEN' | 'CLOSE' | 'PAUSE' | 'RESUME' | null>(null)
  const pending = openStore.isPending || closeStore.isPending || acceptance.isPending
  const actionError = openStore.error ?? closeStore.error ?? acceptance.error

  async function execute() {
    try {
      if (confirmAction === 'OPEN') await openStore.mutateAsync()
      if (confirmAction === 'CLOSE' && management.data?.activeSession) {
        await closeStore.mutateAsync(management.data.activeSession.id)
      }
      if ((confirmAction === 'PAUSE' || confirmAction === 'RESUME') && management.data?.activeSession) {
        await acceptance.mutateAsync({ sessionId: management.data.activeSession.id, accepting: confirmAction === 'RESUME' })
      }
      setConfirmAction(null)
    } catch {
      // Mutation state renders the server error without an unhandled promise.
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm font-semibold text-brand-action">รอบการขาย</p><h1 className="text-2xl font-bold"><Icon name="store" /> รอบการขาย</h1><p className="text-sm text-muted">{activeMembership?.shops?.name}</p></div>
          <button type="button" onClick={() => void management.refetch()} className="rounded-lg border border-line px-3">รีเฟรช</button>
        </div>
        {management.isLoading ? <p className="p-8 text-center">กำลังโหลดสถานะร้าน…</p> : null}
        {management.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{errorText(management.error)}</p> : null}
        {management.data ? <section className={`mt-5 rounded-2xl border p-5 ${management.data.isOpen ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-semibold">สถานะร้าน</p><h2 className={`mt-1 text-3xl font-black ${management.data.isOpen ? 'text-green-800' : 'text-red-700'}`}>{management.data.isOpen ? 'ร้านเปิด' : 'ร้านปิด'}</h2>{management.data.activeSession ? <><p className="mt-2 text-sm">วันทำการ {management.data.activeSession.businessDate}</p><p className="text-sm text-muted">เปิดเมื่อ {dateTime(management.data.activeSession.openedAt)}</p></> : null}</div>
            {management.data.activeSession ? <div className="rounded-xl bg-white p-4 text-center"><p className="text-sm text-muted">ออเดอร์ค้าง</p><p className="text-4xl font-black text-brand-action">{management.data.activeSession.pendingOrderCount}</p>{management.data.activeSession.pendingOrderCount ? <Link to="/queue" className="mt-2 inline-flex rounded-lg border border-line px-3 font-semibold">ไปจัดการคิว</Link> : null}</div> : null}
          </div>
          {management.data.isOpen ? <div className={`mt-5 flex items-center justify-between gap-3 border p-3 ${management.data.acceptingOrders ? 'border-green-200 bg-white' : 'border-amber-300 bg-amber-50'}`}><div><p className="text-xs font-semibold text-muted">การรับออเดอร์</p><p className={`font-bold ${management.data.acceptingOrders ? 'text-green-800' : 'text-amber-900'}`}>{management.data.acceptingOrders ? 'กำลังรับออเดอร์' : 'หยุดรับชั่วคราว'}</p></div><button type="button" disabled={pending} onClick={() => setConfirmAction(management.data.acceptingOrders ? 'PAUSE' : 'RESUME')} className={`min-h-11 shrink-0 border bg-white px-3 text-sm font-bold ${management.data.acceptingOrders ? 'border-amber-500 text-amber-900' : 'border-green-700 text-green-800'}`}>{management.data.acceptingOrders ? 'หยุดรับชั่วคราว' : 'เปิดรับอีกครั้ง'}</button></div> : null}
          <div className="mt-3">{management.data.isOpen ? <button type="button" disabled={pending || !canCloseStore(management.data.activeSession)} onClick={() => setConfirmAction('CLOSE')} className="min-h-12 w-full bg-red-700 px-4 font-bold text-white disabled:opacity-40">ปิดรอบขาย</button> : <button type="button" disabled={pending} onClick={() => setConfirmAction('OPEN')} className="min-h-12 w-full bg-green-700 px-4 font-bold text-white">เปิดร้าน</button>}</div>
          {management.data.isOpen && !canCloseStore(management.data.activeSession) ? <p className="mt-3 border border-amber-300 bg-amber-50 p-3 text-sm">หยุดรับออเดอร์ใหม่ได้ทันที แล้วเคลียร์คิวและยอดค้างชำระก่อนปิดรอบขาย</p> : null}
          {confirmAction ? <div className="mt-4 rounded-xl border border-line bg-white p-4"><p className="font-bold">ยืนยัน{confirmAction === 'OPEN' ? 'เปิดร้านและเริ่มวันทำการ' : confirmAction === 'CLOSE' ? 'ปิดร้านและจบรอบนี้' : confirmAction === 'PAUSE' ? 'หยุดรับออเดอร์ใหม่' : 'กลับมาเปิดรับออเดอร์'}?</p>{confirmAction === 'CLOSE' && !canCloseStore(management.data.activeSession) ? <p className="mt-2 text-sm text-red-700">ยังมีออเดอร์ค้างหรือยังไม่ชำระ กรุณาจัดการในหน้าคิวก่อน</p> : null}<div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmAction(null)} className="rounded-lg border border-line px-3">ยกเลิก</button><button type="button" disabled={pending || (confirmAction === 'CLOSE' && !canCloseStore(management.data.activeSession))} onClick={() => void execute()} className="rounded-lg bg-brand-action px-3 font-semibold text-white disabled:opacity-50">{pending ? 'กำลังดำเนินการ…' : 'ยืนยัน'}</button></div></div> : null}
          {actionError ? <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 text-red-700">{errorText(actionError)}</p> : null}
        </section> : null}
        <StoreSessionHistory sessions={management.data?.history ?? []} />
      </main>
    </AppShell>
  )
}

