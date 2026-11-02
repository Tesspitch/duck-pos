import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'
import { Icon } from '../../../../shared/presentation/Icon'

import { cartLineTotal, useCartStore } from '../../application/cart-store'
import { useCustomerCheckout } from '../../application/use-customer-checkout'
import { useCustomerLocationService } from '../../application/customer-location-context'
import { CustomerNavigation } from './CustomerNavigation'
import { useCustomerTrackingStore } from '../../application/customer-tracking-store'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

export function CustomerCart({ shopId, shopOpen, productImages = {} }: { shopId: string; shopOpen: boolean; productImages?: Record<string, string | null> }) {
  const navigate = useNavigate()
  const trackingToken = useCustomerTrackingStore((state) => state.tokensByShop[shopId])
  const rememberTracking = useCustomerTrackingStore((state) => state.remember)
  const trackingPath = trackingToken ? `/track/${trackingToken}` : undefined
  const locationService = useCustomerLocationService()
  const checkout = useCustomerCheckout()
  const lines = useCartStore((state) => state.lines)
  const changeQuantity = useCartStore((state) => state.changeQuantity)
  const removeLine = useCartStore((state) => state.removeLine)
  const clear = useCartStore((state) => state.clear)
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submitLock = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestIds = useRef<{ idempotencyKey: string; trackingToken: string } | null>(null)
  const total = useMemo(() => lines.reduce((sum, line) => sum + cartLineTotal(line), 0), [lines])
  const quantity = lines.reduce((count, line) => count + line.quantity, 0)

  async function submit() {
    if (!shopOpen || lines.length === 0 || submitLock.current) return
    submitLock.current = true
    setSubmitting(true)
    setErrorMessage(null)
    if (!requestIds.current) requestIds.current = { idempotencyKey: crypto.randomUUID(), trackingToken: crypto.randomUUID() }
    try {
      const location = await locationService.capture()
      const result = await checkout.mutateAsync({ shopId, location, lines, note, ...requestIds.current })
      rememberTracking(shopId, result.trackingToken)
      clear()
      requestIds.current = null
      navigate(`/track/${result.trackingToken}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ส่งออเดอร์ไม่สำเร็จ')
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  return (
    <>
    {!expanded && <CustomerNavigation active="menu" quantity={quantity} trackingPath={trackingPath} onMenu={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onCart={() => setExpanded(true)} />}
    {lines.length > 0 && <aside className="customer-cart-bar">
      <div className="mx-auto max-w-4xl">
        <button type="button" aria-haspopup="dialog" aria-expanded={expanded} onClick={() => setExpanded(true)} className="cart-open-button"><span className="flex items-center gap-2"><Icon name="bag" /> ดูตะกร้า <span className="cart-count">{lines.reduce((count, line) => count + line.quantity, 0)}</span></span><span>{money(total)} →</span></button>
        {expanded && <FormWorkspace title="ตะกร้าของคุณ" busy={submitting} onBack={() => setExpanded(false)}>
        <div className="customer-cart-workspace">
        <div id="customer-cart-details" className="customer-cart-page">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">ตะกร้า · {lines.length} รายการ</h2><p className="text-xl font-bold text-brand-action">{money(total)}</p></div>
        <ul className="mt-3 grid gap-2">
          {lines.map((line) => <li key={line.key} className="cart-item"><div className="flex items-start gap-3">{productImages[line.productId] ? <img src={productImages[line.productId]!} alt={line.productName} width="64" height="64" className="cart-product-image" loading="lazy" /> : <span className="cart-product-placeholder" aria-hidden="true"><Icon name="menu" /></span>}<div className="min-w-0"><p className="font-semibold">{line.productName}</p><p className="text-xs text-muted">{line.options.map((option) => option.name).join(', ')}</p>{line.note && <p className="text-xs text-muted">{line.note}</p>}</div></div><div className="flex flex-wrap items-center gap-2"><input disabled={submitting} aria-label={`จำนวน ${line.productName}`} inputMode="numeric" type="number" min={1} max={20} step={1} value={line.quantity} onChange={(event) => changeQuantity(line.key, Number(event.target.value))} className="w-16 rounded-lg border border-line px-2" /><span className="w-24 text-right font-semibold">{money(cartLineTotal(line))}</span><button type="button" disabled={submitting} aria-label={`ลบ ${line.productName}`} onClick={() => { if (lines.length === 1) setExpanded(false); removeLine(line.key) }} className="min-h-11 px-2 text-sm text-red-700">ลบ</button></div></li>)}
        </ul>
        <label className="mt-3 grid gap-1 text-sm">หมายเหตุทั้งออเดอร์<input disabled={submitting} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} className="rounded-lg border border-line px-3" /></label>
        {!shopOpen && <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">ร้านปิดอยู่ · ยังส่งออเดอร์ไม่ได้</p>}
        <button type="button" onClick={() => void submit()} disabled={!shopOpen || submitting} className="cart-checkout-button">{submitting ? 'กำลังตรวจตำแหน่งและส่งออเดอร์…' : shopOpen ? `ยืนยันออเดอร์ · ${money(total)}` : 'ร้านปิดอยู่'}</button>
        {errorMessage || checkout.error ? <p role="alert" className="mt-2 text-sm text-red-700">{errorMessage ?? checkout.error?.message}</p> : null}
        </div>
        <CustomerNavigation active="cart" quantity={quantity} busy={submitting} trackingPath={trackingPath} onMenu={() => setExpanded(false)} onCart={() => {}} />
        </div>
        </FormWorkspace>}
      </div>
    </aside>}
    </>
  )
}
