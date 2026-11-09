import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../../shared/presentation/Icon'
import { LoadingState } from '../../../shared/presentation/LoadingState'
import { useAttendanceClock } from '../application/use-attendance'
import { attendanceError, attendanceTimeZone, type ActiveTimeEntry } from '../domain/attendance'

const dateTime = new Intl.DateTimeFormat('th-TH', {
  timeZone: attendanceTimeZone, dateStyle: 'medium', timeStyle: 'short',
})
const today = new Intl.DateTimeFormat('th-TH', {
  timeZone: attendanceTimeZone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
})

export function AttendanceClockCard({ shopId, shopName, compact = false }: { shopId: string; shopName?: string; compact?: boolean }) {
  const { state, action } = useAttendanceClock()
  const [confirmation, setConfirmation] = useState<{ type: 'IN' } | { type: 'OUT'; entry: ActiveTimeEntry } | null>(null)
  const [message, setMessage] = useState('')
  const active = state.data?.activeEntry
  const busy = action.isPending
  const statusChanged = confirmation?.type === 'OUT' ? confirmation.entry.id !== active?.id : Boolean(confirmation && active)

  async function confirm() {
    if (!confirmation || busy || statusChanged) return
    try {
      if (confirmation.type === 'IN') await action.mutateAsync({ type: 'IN', shopId })
      else await action.mutateAsync({ type: 'OUT', entryId: confirmation.entry.id })
      setMessage(confirmation.type === 'IN' ? 'ลงเวลาเข้างานแล้ว' : 'ลงเวลาออกงานแล้ว')
      setConfirmation(null)
    } catch { /* Show the mutation error alongside the action. */ }
  }

  return <section aria-label="ลงเวลาของฉัน" className={`attendance-card attendance-clock${compact ? ' attendance-clock-compact' : ''}`}>
    {compact && <header className="flex flex-wrap items-center justify-between gap-x-3">
      <h2 className="flex items-center gap-2 font-bold"><Icon name="clock" size={18} /> เวลาทำงานของฉัน</h2>
      <Link to="/attendance" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-action">ดูประวัติ <Icon name="arrow" size={14} /></Link>
    </header>}
    {state.isPending ? <LoadingState label="กำลังตรวจสอบเวลาเข้างาน…" /> : state.isError ? <p role="alert" className="text-sm text-red-700">{attendanceError(state.error)} <button type="button" className="min-h-11 underline" onClick={() => void state.refetch()}>ลองใหม่</button></p> : <>
      <div className={`attendance-state${active ? ' is-working' : ''}`}>
        <span className="attendance-icon"><Icon name={active ? 'check' : 'clock'} /></span>
        <div className="min-w-0">
          <p className="font-bold">{active ? 'กำลังทำงาน' : 'ยังไม่ได้ลงเวลาเข้า'}</p>
          <p className="break-words text-sm text-muted">{active
            ? `${active.shopName} · เข้า ${dateTime.format(new Date(active.clockedInAt))}`
            : `วันนี้ · ${today.format(new Date(state.data.serverTime))}`}</p>
        </div>
      </div>
      {confirmation ? <div className="grid gap-2 rounded-xl border border-line p-3">
        <p className="break-words font-semibold">{confirmation.type === 'IN' ? `ยืนยันเข้างาน · ${shopName ?? 'สาขานี้'}` : `ยืนยันออกงาน · ${confirmation.entry.shopName}`}</p>
        {statusChanged && !busy ? <p className="text-sm text-muted">สถานะลงเวลาเปลี่ยนแล้ว กรุณายกเลิกและเลือกใหม่</p>
          : confirmation.type === 'IN' && <p className="text-sm text-muted">ระบบจะตรวจตำแหน่งในรัศมี 100 เมตรจากร้านเมื่อกดยืนยัน</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => { action.reset(); setConfirmation(null) }} className="min-h-11 rounded-lg border border-line px-2">ยกเลิก</button>
          <button type="button" disabled={busy || statusChanged} onClick={() => void confirm()} className="min-h-11 rounded-lg bg-brand-action px-2 font-bold text-white disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'ยืนยัน'}</button>
        </div>
      </div> : <button type="button" disabled={busy || state.isFetching || !shopId} onClick={() => {
        action.reset()
        setMessage('')
        setConfirmation(active ? { type: 'OUT', entry: active } : { type: 'IN' })
      }} className={`attendance-clock-action${active ? ' is-clock-out' : ''}`}>
        <Icon name={active ? 'logout' : 'clock'} /> {active ? 'ลงเวลาออกงาน' : 'ลงเวลาเข้างาน'}
      </button>}
    </>}
    {action.error && <p role="alert" className="text-sm text-red-700">{attendanceError(action.error)}</p>}
    {busy && confirmation?.type === 'IN' && <p role="status" className="text-sm text-muted">กำลังค้นหาตำแหน่งและตรวจระยะจากร้าน…</p>}
    {message && <p role="status" className="text-sm text-green-800">{message}</p>}
  </section>
}
