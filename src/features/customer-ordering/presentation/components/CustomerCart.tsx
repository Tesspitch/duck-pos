import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { cartLineTotal, useCartStore } from '../../application/cart-store'
import { useCustomerCheckout } from '../../application/use-customer-checkout'
import { useCustomerLocationService } from '../../application/customer-location-context'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

export function CustomerCart({ shopId, shopOpen }: { shopId: string; shopOpen: boolean }) {
  const navigate = useNavigate()
  const locationService = useCustomerLocationService()
  const checkout = useCustomerCheckout()
  const lines = useCartStore((state) => state.lines)
  const changeQuantity = useCartStore((state) => state.changeQuantity)
  const removeLine = useCartStore((state) => state.removeLine)
  const clear = useCartStore((state) => state.clear)
  const [note, setNote] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestIds = useRef<{ idempotencyKey: string; trackingToken: string } | null>(null)
  const total = useMemo(() => lines.reduce((sum, line) => sum + cartLineTotal(line), 0), [lines])

  async function submit() {
    if (!shopOpen || lines.length === 0 || checkout.isPending) return
    setErrorMessage(null)
    if (!requestIds.current) requestIds.current = { idempotencyKey: crypto.randomUUID(), trackingToken: crypto.randomUUID() }
    try {
      const location = await locationService.capture()
      const result = await checkout.mutateAsync({ shopId, location, lines, note, ...requestIds.current })
      clear()
      requestIds.current = null
      navigate(`/track/${result.trackingToken}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ส่งออเดอร์ไม่สำเร็จ')
    }
  }

  if (lines.length === 0) return null

  return (
    <aside className="sticky bottom-0 z-10 border-t border-line bg-white p-4 shadow-[0_-4px_16px_rgba(17,24,39,0.08)]">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">ตะกร้า · {lines.length} รายการ</h2><p className="text-xl font-bold text-brand-action">{money(total)}</p></div>
        <ul className="mt-3 grid gap-2">
          {lines.map((line) => <li key={line.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-soft p-3"><div><p className="font-semibold">{line.productName}</p><p className="text-xs text-muted">{line.options.map((option) => option.name).join(', ') || 'ไม่มีตัวเลือก'}</p></div><div className="flex items-center gap-2"><input aria-label={`จำนวน ${line.productName}`} type="number" min={1} max={20} value={line.quantity} onChange={(event) => changeQuantity(line.key, Number(event.target.value))} className="w-16 rounded-lg border border-line px-2" /><span className="w-24 text-right font-semibold">{money(cartLineTotal(line))}</span><button type="button" onClick={() => removeLine(line.key)} className="min-h-11 px-2 text-sm text-red-700">ลบ</button></div></li>)}
        </ul>
        <label className="mt-3 grid gap-1 text-sm">หมายเหตุทั้งออเดอร์<input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} className="rounded-lg border border-line px-3" /></label>
        <button type="button" onClick={() => void submit()} disabled={!shopOpen || checkout.isPending} className="mt-3 min-h-12 w-full rounded-xl bg-brand-action px-4 font-bold text-white disabled:opacity-50">{checkout.isPending ? 'กำลังตรวจตำแหน่งและส่งออเดอร์…' : shopOpen ? 'ตรวจตำแหน่งและยืนยันออเดอร์' : 'ร้านปิดอยู่'}</button>
        {errorMessage || checkout.error ? <p role="alert" className="mt-2 text-sm text-red-700">{errorMessage ?? checkout.error?.message}</p> : null}
      </div>
    </aside>
  )
}
