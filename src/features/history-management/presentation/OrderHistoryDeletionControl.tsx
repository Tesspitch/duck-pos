import { useState } from 'react'
import { FormWorkspace } from '../../../shared/presentation/FormWorkspace'
import { ItemActions } from '../../../shared/presentation/ItemActions'
import { useHistoryDeletion } from '../application/use-history-deletion'

const money = (value: number) => `฿${(value / 100).toFixed(2)}`
const errors: Record<string, string> = {
  RESOLVE_ORDER_FIRST: 'ลบได้เมื่อออเดอร์เสร็จและรับชำระแล้ว หรือเป็นออเดอร์ที่ยกเลิกแล้วเท่านั้น',
  'History changed. Preview again before deleting.': 'ข้อมูลออเดอร์เปลี่ยนแล้ว กรุณาตรวจสอบใหม่',
  'Shop name confirmation does not match.': 'ชื่อร้านไม่ตรง กรุณาตรวจสอบอีกครั้ง',
}

interface Props { shopId: string; shopName: string; orderId: string; orderReference: string }

export function OrderHistoryDeletionControl(props: Props) {
  const [open, setOpen] = useState(false)
  return <><ItemActions name={`ออเดอร์ ${props.orderReference}`} deleteLabel="ลบออเดอร์นี้" onDelete={() => setOpen(true)} />
    {open && <OrderDeletionEditor {...props} onBack={() => setOpen(false)} />}
  </>
}

function OrderDeletionEditor({ shopId, shopName, orderId, orderReference, onBack }: Props & { onBack: () => void }) {
  const [confirmation, setConfirmation] = useState('')
  const { previewOrder, removeOrder } = useHistoryDeletion()
  const busy = previewOrder.isPending || removeOrder.isPending
  const error = previewOrder.error ?? removeOrder.error
  return <FormWorkspace title="ลบออเดอร์จากประวัติ" busy={busy} onBack={onBack}>
    <section className="grid min-w-0 gap-4 border border-line bg-white p-4">
      <div><p className="text-sm text-muted">ออเดอร์</p><h2 className="text-xl font-bold">{orderReference}</h2></div>
      <p className="text-sm text-muted">ระบบจะลบรายการสินค้า การชำระเงิน และสถานะติดตามของออเดอร์นี้ ยอดรายงานจะลดลงตามจริง เลขคิวของออเดอร์อื่นจะไม่เปลี่ยน</p>
      {!previewOrder.data ? <button type="button" disabled={busy} onClick={() => previewOrder.mutate({ shopId, orderId })} className="min-h-12 border border-line px-4 font-semibold">{busy ? 'กำลังตรวจสอบ…' : 'ตรวจสอบก่อนลบ'}</button> : <div className="grid gap-3 border border-red-200 bg-red-50 p-4">
        <p className="font-bold">คิว {previewOrder.data.queueNumber} · {previewOrder.data.orderReference}</p>
        <p>ยอดขาย {money(previewOrder.data.grossSatang)} · รับชำระ {money(previewOrder.data.collectedSatang)}</p>
        {previewOrder.data.blockedReason ? <p role="alert" className="font-semibold text-red-800">{errors[previewOrder.data.blockedReason] ?? 'ยังไม่สามารถลบออเดอร์นี้ได้'}</p> : <>
          <label className="grid gap-1 text-sm">พิมพ์ชื่อร้านเพื่อยืนยัน<input disabled={busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-w-0 border border-line bg-white px-3" /></label>
          <button type="button" disabled={busy || confirmation !== shopName} onClick={() => removeOrder.mutate({ shopId, orderId, fingerprint: previewOrder.data!.fingerprint, confirmationName: confirmation }, { onSuccess: onBack })} className="min-h-12 bg-red-700 px-4 font-semibold text-white disabled:opacity-50">{removeOrder.isPending ? 'กำลังลบ…' : 'ยืนยันลบออเดอร์ถาวร'}</button>
        </>}
      </div>}
      {error && <p role="alert" className="text-sm text-red-700">{errors[error.message] ?? 'ทำรายการไม่สำเร็จ กรุณาลองใหม่'}</p>}
    </section>
  </FormWorkspace>
}
