import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AppShell } from '../../../../shared/presentation/AppShell'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useCloseStore, useOpenStore, useStoreManagement } from '../../application/use-store-management'
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
  const [confirmAction, setConfirmAction] = useState<'OPEN' | 'CLOSE' | null>(null)
  const pending = openStore.isPending || closeStore.isPending
  const actionError = openStore.error ?? closeStore.error

  async function execute() {
    if (confirmAction === 'OPEN') await openStore.mutateAsync()
    if (confirmAction === 'CLOSE' && management.data?.activeSession) {
      await closeStore.mutateAsync(management.data.activeSession.id)
    }
    setConfirmAction(null)
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm font-semibold text-brand-action">Phase 5 · Owner</p><h1 className="text-2xl font-bold">เปิด–ปิดร้าน</h1><p className="text-sm text-muted">{activeMembership?.shops?.name}</p></div>
          <button type="button" onClick={() => void management.refetch()} className="rounded-lg border border-line px-3">รีเฟรช</button>
        </div>
        {management.isLoading ? <p className="p-8 text-center">กำลังโหลดสถานะร้าน…</p> : null}
        {management.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{errorText(management.error)}</p> : null}
        {management.data ? <section className={`mt-5 rounded-2xl border p-5 ${management.data.isOpen ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-semibold">สถานะร้าน</p><h2 className={`mt-1 text-3xl font-black ${management.data.isOpen ? 'text-green-800' : 'text-red-700'}`}>{management.data.isOpen ? 'OPEN · เปิดรับออเดอร์' : 'CLOSED · ปิดรับออเดอร์'}</h2>{management.data.activeSession ? <><p className="mt-2 text-sm">วันทำการ {management.data.activeSession.businessDate}</p><p className="text-sm text-muted">เปิดเมื่อ {dateTime(management.data.activeSession.openedAt)}</p></> : null}</div>
            {management.data.activeSession ? <div className="rounded-xl bg-white p-4 text-center"><p className="text-sm text-muted">ออเดอร์ค้าง</p><p className="text-4xl font-black text-brand-action">{management.data.activeSession.pendingOrderCount}</p>{management.data.activeSession.pendingOrderCount ? <Link to="/queue" className="mt-2 inline-flex rounded-lg border border-line px-3 font-semibold">ไปจัดการคิว</Link> : null}</div> : null}
          </div>
          <button type="button" disabled={pending} onClick={() => setConfirmAction(management.data.isOpen ? 'CLOSE' : 'OPEN')} className={`mt-5 w-full rounded-xl px-4 font-bold text-white disabled:opacity-50 ${management.data.isOpen ? 'bg-red-700' : 'bg-green-700'}`}>{management.data.isOpen ? 'ปิดร้าน' : 'เปิดร้าน'}</button>
          {confirmAction ? <div className="mt-4 rounded-xl border border-line bg-white p-4"><p className="font-bold">ยืนยัน{confirmAction === 'OPEN' ? 'เปิดร้านและเริ่มวันทำการ' : 'ปิดร้านและจบรอบนี้'}?</p>{confirmAction === 'CLOSE' && !canCloseStore(management.data.activeSession) ? <p className="mt-2 text-sm text-red-700">ยังมีออเดอร์ค้าง กรุณาจัดการในหน้าคิวก่อน</p> : null}<div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmAction(null)} className="rounded-lg border border-line px-3">ยกเลิก</button><button type="button" disabled={pending || (confirmAction === 'CLOSE' && !canCloseStore(management.data.activeSession))} onClick={() => void execute()} className="rounded-lg bg-brand-action px-3 font-semibold text-white disabled:opacity-50">{pending ? 'กำลังดำเนินการ…' : 'ยืนยัน'}</button></div></div> : null}
          {actionError ? <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 text-red-700">{errorText(actionError)}</p> : null}
        </section> : null}
        <StoreSessionHistory sessions={management.data?.history ?? []} />
      </main>
    </AppShell>
  )
}

