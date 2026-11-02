import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCustomerOrderingRepository } from '../../application/customer-ordering-context'
import type { TrackedOrder } from '../../domain/customer-order'

export function CancelCustomerOrder({ token, order }: { token: string; order: TrackedOrder }) {
  const [confirming, setConfirming] = useState(false)
  const repository = useCustomerOrderingRepository()
  const client = useQueryClient()
  const cancel = useMutation({
    mutationFn: () => repository.cancel(token),
    onSuccess: () => setConfirming(false),
    onSettled: () => client.invalidateQueries({ queryKey: ['customer-order-tracking', token] }),
  })

  if (order.status !== 'QUEUED') return null
  if (order.paymentStatus !== 'UNPAID') return <p className="mt-5 text-sm text-muted">ต้องการยกเลิกออเดอร์ที่ชำระแล้ว กรุณาติดต่อร้าน</p>
  return <div className="mt-5 border-t border-line pt-4">
    {confirming ? <div role="group" aria-label="ยืนยันยกเลิกออเดอร์">
      <p className="font-semibold">ยกเลิกคิว {String(order.queueNumber).padStart(3, '0')}?</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={cancel.isPending} onClick={() => setConfirming(false)} className="min-h-12 border border-line px-3">เก็บออเดอร์ไว้</button>
        <button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate()} className="min-h-12 bg-red-700 px-3 font-semibold text-white disabled:opacity-50">{cancel.isPending ? 'กำลังยกเลิก…' : 'ยืนยันยกเลิก'}</button>
      </div>
    </div> : <button type="button" onClick={() => { cancel.reset(); setConfirming(true) }} className="min-h-12 w-full border border-red-200 px-3 font-semibold text-red-700">ยกเลิกออเดอร์</button>}
    {cancel.isError && <p role="alert" className="mt-3 text-sm text-red-700">ยกเลิกไม่สำเร็จ ร้านอาจเริ่มทำหรือรับชำระแล้ว กรุณาตรวจสถานะอีกครั้ง</p>}
  </div>
}
