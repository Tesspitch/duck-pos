import { useState } from 'react'
import { FormWorkspace } from '../../../shared/presentation/FormWorkspace'
import { ItemActions } from '../../../shared/presentation/ItemActions'
import { useHistoryDeletion } from '../application/use-history-deletion'
import type { HistoryKind } from '../domain/history-deletion'

const messages: Record<string, string> = {
  CLOSE_STORE_FIRST: 'กรุณาปิดรอบขายในช่วงวันที่เลือกก่อน',
  RESOLVE_ORDERS_FIRST: 'ยังมีออเดอร์หรือยอดรับชำระค้างในช่วงวันที่เลือก',
  NARROW_DATE_RANGE: 'กรุณาเลือกช่วงวันที่ให้แคบลง (ไม่เกิน 5,000 รายการต่อครั้ง)',
  'History changed. Preview again before deleting.': 'ข้อมูลเปลี่ยนแล้ว กรุณาตรวจสอบรายการใหม่ก่อนยืนยัน',
  'Shop name confirmation does not match.': 'ชื่อร้านไม่ตรง กรุณาตรวจสอบอีกครั้ง',
  'Date range cannot exceed 366 days.': 'เลือกช่วงวันที่ได้ไม่เกิน 366 วันต่อครั้ง',
}
const money = (value: number) => `฿${(value / 100).toFixed(2)}`
interface Props { shopId: string; shopName: string; kind: HistoryKind; dateFrom: string; dateTo: string }

export function HistoryDeletionControl({ shopId, shopName, kind, dateFrom, dateTo }: Props) {
  const [open, setOpen] = useState(false)
  const title = kind === 'SALES' ? 'ลบประวัติการขาย' : 'ลบประวัติการส่งแจ้งเตือน'
  return <><ItemActions name={title} deleteLabel={title} onDelete={() => setOpen(true)} />
    {open && <HistoryDeletionEditor shopId={shopId} shopName={shopName} kind={kind} dateFrom={dateFrom} dateTo={dateTo} title={title} onBack={() => setOpen(false)} />}
  </>
}

function HistoryDeletionEditor({ shopId, shopName, kind, dateFrom, dateTo, title, onBack }: Props & { title: string; onBack: () => void }) {
  const [from, setFrom] = useState(dateFrom)
  const [to, setTo] = useState(dateTo)
  const [confirmation, setConfirmation] = useState('')
  const { preview, remove } = useHistoryDeletion()
  const busy = preview.isPending || remove.isPending
  const range = { shopId, kind, dateFrom: from, dateTo: to }
  const error = remove.error ?? preview.error
  const reset = () => { preview.reset(); remove.reset(); setConfirmation('') }
  return <FormWorkspace title={title} busy={busy} onBack={onBack}>
    <section className="grid min-w-0 gap-4 border border-line bg-white p-4">
      <h2 className="break-words text-lg font-bold">{shopName}</h2>
      <p className="text-sm text-muted">{kind === 'SALES' ? 'ลบทุกออเดอร์และการชำระเงินตามช่วงวันทำการที่เลือก ยอดรายงานจะลดลงตามข้อมูลที่ลบ รวมทุกช่องทางและทุกวิธีชำระ' : 'ลบข้อมูลการส่งที่สิ้นสุดแล้วตามวันที่สร้างรายงาน งานที่กำลังส่งหรือรอส่งจะยังอยู่'}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">ตั้งแต่วันที่<input type="date" disabled={busy} value={from} onChange={(event) => { setFrom(event.target.value); reset() }} className="min-w-0 border border-line px-3" /></label>
        <label className="grid gap-1 text-sm">ถึงวันที่<input type="date" disabled={busy} min={from} value={to} onChange={(event) => { setTo(event.target.value); reset() }} className="min-w-0 border border-line px-3" /></label>
      </div>
      <button type="button" disabled={busy || !from || !to || from > to} onClick={() => { remove.reset(); preview.mutate(range) }} className="min-h-12 border border-line px-4 font-semibold disabled:opacity-50">{preview.isPending ? 'กำลังตรวจสอบ…' : 'ตรวจสอบรายการที่จะลบ'}</button>
      {preview.data && <div className="grid gap-3 border border-red-200 bg-red-50 p-4">
        <p className="font-bold">{preview.data.count.toLocaleString('th-TH')} รายการ</p>
        {kind === 'SALES' && <><p>ยอดขาย {money(preview.data.grossSatang)}</p><p>ยอดรับชำระ {money(preview.data.collectedSatang)}</p></>}
        {preview.data.blockedReason ? <p role="alert" className="text-sm font-semibold text-red-800">{messages[preview.data.blockedReason] ?? 'ยังไม่สามารถลบช่วงวันที่นี้ได้'}</p> : preview.data.count > 0 && <>
          <p className="text-sm text-red-800">ลบแล้วกู้คืนผ่านหน้าเว็บไม่ได้{kind === 'SALES' ? ' ลิงก์ติดตามออเดอร์ที่ลบจะใช้ไม่ได้ด้วย' : ''}</p>
          <label className="grid gap-1 text-sm">พิมพ์ชื่อร้านเพื่อยืนยัน<input disabled={busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-w-0 border border-line bg-white px-3" /></label>
          <button type="button" disabled={busy || confirmation !== shopName} onClick={() => remove.mutate({ ...range, fingerprint: preview.data!.fingerprint, confirmationName: confirmation }, { onSuccess: onBack })} className="min-h-12 bg-red-700 px-4 font-semibold text-white disabled:opacity-50">{remove.isPending ? 'กำลังลบ…' : 'ยืนยันลบถาวร'}</button>
        </>}
      </div>}
      {error && <p role="alert" className="text-sm text-red-700">{messages[error.message] ?? 'ทำรายการไม่สำเร็จ กรุณาตรวจสอบรายการอีกครั้ง'}</p>}
    </section>
  </FormWorkspace>
}
