import { useState } from 'react'

import { paymentSchema } from '../../application/staff-order-schemas'
import type { PaymentMethod, StaffOrder } from '../../domain/staff-order'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

interface Props {
  order: StaffOrder
  pending: boolean
  onPay: (method: PaymentMethod, amountReceivedSatang: number) => void
}

export function PaymentPanel({ order, pending, onPay }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [amount, setAmount] = useState((order.totalSatang / 100).toFixed(2))
  const [error, setError] = useState<string | null>(null)
  const amountSatang = Math.round(Number(amount || 0) * 100)
  const change = method === 'CASH' ? Math.max(0, amountSatang - order.totalSatang) : 0

  function submit() {
    const result = paymentSchema.safeParse({ amountBaht: amount })
    if (!result.success) return setError(result.error.issues[0]?.message ?? 'ยอดเงินไม่ถูกต้อง')
    if (method === 'BANK_TRANSFER' && amountSatang !== order.totalSatang) return setError('ยอดเงินโอนต้องเท่ากับยอดออเดอร์')
    if (amountSatang < order.totalSatang) return setError('ยอดรับเงินน้อยกว่ายอดออเดอร์')
    setError(null)
    onPay(method, amountSatang)
  }

  return (
    <div className="mt-3 rounded-xl bg-brand-soft p-3">
      <p className="font-semibold">บันทึกการชำระเงิน</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">วิธีชำระ
          <select value={method} onChange={(event) => {
            const value = event.target.value as PaymentMethod
            setMethod(value)
            if (value === 'BANK_TRANSFER') setAmount((order.totalSatang / 100).toFixed(2))
          }} className="rounded-lg border border-line bg-white px-2">
            <option value="CASH">เงินสด</option><option value="BANK_TRANSFER">เงินโอน</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">ยอดรับ (บาท)
          <input type="number" min={order.totalSatang / 100} step="0.01" value={amount}
            readOnly={method === 'BANK_TRANSFER'} onChange={(event) => setAmount(event.target.value)}
            className="rounded-lg border border-line bg-white px-3" />
        </label>
      </div>
      {method === 'CASH' ? <p className="mt-2 font-bold text-green-800">เงินทอน {money(change)}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <button type="button" disabled={pending} onClick={submit} className="mt-3 w-full rounded-lg bg-green-700 px-3 font-semibold text-white disabled:opacity-50">
        {pending ? 'กำลังบันทึก…' : 'ยืนยันรับชำระ'}
      </button>
    </div>
  )
}

