import { QuantityStepper } from '../../../../shared/presentation/QuantityStepper'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'
import { Icon } from '../../../../shared/presentation/Icon'

import { cartLineTotal, useCartStore } from '../../application/cart-store'
import { useCustomerCheckout } from '../../application/use-customer-checkout'
import { useCustomerLocationService } from '../../application/customer-location-context'
import { CustomerNavigation } from './CustomerNavigation'
import { useCustomerTrackingStore } from '../../application/customer-tracking-store'
import type { TableOrderContext } from '../../../dining/domain/dining'
import { diningError } from '../../../dining/domain/dining'
import { tableCheckoutAttempt, clearTableCheckoutAttempt } from '../../../dining/application/checkout-attempt'
import { saveRound } from '../../../dining/application/round-memory'
import { beginCriticalTask } from '../../../../shared/application/update-safety'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

export function CustomerCart({ shopId, shopName, shopOpen, productImages = {}, tableOrder }: { shopId: string; shopName?: string; shopOpen: boolean; productImages?: Record<string, string | null>; tableOrder?: TableOrderContext }) {
  const navigate = useNavigate()
  const trackingToken = useCustomerTrackingStore((state) => state.tokensByShop[shopId])
  const rememberTracking = useCustomerTrackingStore((state) => state.remember)
  const trackingPath = tableOrder ? `/table-round/${tableOrder.guestToken}` : trackingToken ? `/track/${trackingToken}` : undefined
  const locationService = useCustomerLocationService()
  const checkout = useCustomerCheckout()
  const lines = useCartStore((state) => state.lines)
  const changeQuantity = useCartStore((state) => state.changeQuantity)
  const removeLine = useCartStore((state) => state.removeLine)
  const clear = useCartStore((state) => state.clear)
  const note = useCartStore(state=>state.orderNote)
  const setNote = useCartStore(state=>state.setOrderNote)
  const checkoutIdentity = useCartStore(state=>state.checkoutIdentity)
  const [expanded, setExpanded] = useState(false)
  const [review, setReview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submitLock = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [locationProblem,setLocationProblem]=useState<'permission'|'outside'|null>(null)
  const total = useMemo(() => lines.reduce((sum, line) => sum + cartLineTotal(line), 0), [lines])
  const quantity = lines.reduce((count, line) => count + line.quantity, 0)
  function editCart() { setReview(false); setErrorMessage(null); setLocationProblem(null); checkout.reset() }
  function closeCart() { editCart(); setExpanded(false) }

  async function submit() {
    if (!shopOpen || lines.length === 0 || submitLock.current) return
    submitLock.current = true
    const finishTask=beginCriticalTask()
    setSubmitting(true)
    setErrorMessage(null)
    setLocationProblem(null)
    let checkingLocation=!tableOrder
    try {
      const signature=JSON.stringify({lines,note})
      const requestIds=tableOrder?tableCheckoutAttempt(tableOrder.billId,tableOrder.guestToken,signature):checkoutIdentity(signature)
      const location = tableOrder ? undefined : await locationService.capture()
      checkingLocation=false
      const result = await checkout.mutateAsync({ shopId, location, lines, note, ...requestIds, ...(tableOrder ? { tableOrder } : {}) })
      if (tableOrder && result.tableBillId) saveRound({billId:result.tableBillId,guestToken:tableOrder.guestToken,tableQrToken:tableOrder.tableQrToken,shopId,tableEpoch:tableOrder.tableEpoch})
      if (!tableOrder) rememberTracking(shopId, result.trackingToken)
      if (tableOrder) clearTableCheckoutAttempt(tableOrder.billId,tableOrder.guestToken)
      clear()
      navigate(tableOrder ? `/table-round/${tableOrder.guestToken}` : `/track/${result.trackingToken}`)
    } catch (error) {
      const message=error instanceof Error?error.message:'ส่งออเดอร์ไม่สำเร็จ'
      const outside=!tableOrder&&/outside the ordering area|นอกพื้นที่|นอกรัศมี/i.test(message)
      if(outside||checkingLocation)setLocationProblem(outside?'outside':'permission')
      setErrorMessage(outside?'กรุณาอยู่ภายในระยะ 100 เมตรจากร้าน แล้วตรวจสอบตำแหน่งอีกครั้ง':tableOrder?diningError(error):message)
    } finally {
      finishTask()
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
        {expanded && <FormWorkspace title={review?'ยืนยันออเดอร์':'ตะกร้าของคุณ'} busy={submitting} onBack={review?editCart:closeCart}>
        <div className="customer-cart-workspace">
        <div id="customer-cart-details" className="customer-cart-page">
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-brand-soft p-4"><Icon name={tableOrder?'store':'bag'} size={28} className="shrink-0 text-brand-action"/><div><p className="font-bold">{tableOrder?`ทานที่ร้าน · ${tableOrder.tableName}`:'สั่งกลับบ้าน · รับที่ร้าน'}</p><p className="text-sm text-muted">{tableOrder?'รวมบิลโต๊ะ':shopName?`สั่งอาหารและมารับที่ร้าน ${shopName}`:'รับอาหารที่หน้าร้าน'}</p></div></div>
        <h2 className="text-xl font-bold">{review?'ตรวจสอบก่อนยืนยัน':`รายการอาหาร (${lines.length})`}</h2>
        {review?<><ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white px-4">{lines.map(line=><li key={line.key} className="flex justify-between gap-3 py-3"><span className="min-w-0 break-words">{line.productName} × {line.quantity}</span><strong className="shrink-0">{money(cartLineTotal(line))}</strong></li>)}</ul>{note&&<p className="mt-2 break-words text-sm text-muted">หมายเหตุ: {note}</p>}</>:<>
        <ul className="mt-3 grid gap-2">
          {lines.map((line) => <li key={line.key} className="cart-item"><div className="flex items-start gap-3">{productImages[line.productId] ? <img src={productImages[line.productId]!} alt={line.productName} width="64" height="64" className="cart-product-image" loading="lazy" /> : <span className="cart-product-placeholder" aria-hidden="true"><Icon name="menu" /></span>}<div className="min-w-0"><p className="font-semibold">{line.productName}</p><p className="text-xs text-muted">{line.options.map((option) => option.name).join(', ')}</p>{line.note && <p className="text-xs text-muted">{line.note}</p>}</div><strong className="ml-auto shrink-0 text-sm">{money(cartLineTotal(line))}</strong></div><div className="cart-item-controls flex flex-wrap items-center gap-2"><QuantityStepper disabled={submitting} label={`จำนวน ${line.productName}`} value={line.quantity} onChange={(value) => changeQuantity(line.key, value)} showLabel={false} /><button type="button" disabled={submitting} aria-label={`ลบ ${line.productName}`} onClick={() => { if (lines.length === 1) setExpanded(false); removeLine(line.key) }} className="grid min-h-11 min-w-11 place-items-center rounded-lg text-red-700"><Icon name="trash" size={19}/></button></div></li>)}
        </ul>
        <label className="mt-3 grid gap-1 text-sm">หมายเหตุทั้งออเดอร์<input disabled={submitting} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} className="rounded-lg border border-line px-3" /></label>
        </>}
        <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-white"><h3 className="px-4 pt-3 font-bold">สรุปยอด</h3><p className="flex justify-between gap-2 px-4 py-3 text-sm"><span>ยอดรวมสินค้า ({quantity} ชิ้น)</span><strong>{money(total)}</strong></p><div className="flex flex-wrap items-center justify-between gap-2 bg-brand-soft px-4 py-3"><strong>ยอดชำระทั้งหมด</strong><strong className="text-xl text-brand-action">{money(total)}</strong></div></section>
        {!tableOrder&&<p className="mt-4 flex items-center gap-2 rounded-xl bg-[#f1f3f0] p-3 text-sm"><Icon name="pin" className="shrink-0"/>ระบบจะตรวจสอบตำแหน่งก่อนส่งคำสั่งซื้อ</p>}
        {!shopOpen && <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">ร้านปิดอยู่ · ยังส่งออเดอร์ไม่ได้</p>}
        {review&&(errorMessage||checkout.error)&&<div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>{locationProblem==='outside'?'คุณอยู่นอกพื้นที่สั่งอาหาร':locationProblem==='permission'?'ตรวจสอบตำแหน่งไม่สำเร็จ':'ส่งออเดอร์ไม่สำเร็จ'}</strong><p>{errorMessage??checkout.error?.message}</p></div>}
        <button type="button" onClick={()=>review?void submit():setReview(true)} disabled={!shopOpen||submitting} className="cart-checkout-button">{submitting?tableOrder?'กำลังส่งออเดอร์…':'กำลังตรวจตำแหน่งและส่งออเดอร์…':!shopOpen?'ร้านปิดอยู่':locationProblem?'ตรวจสอบตำแหน่งอีกครั้ง':review?`ยืนยันออเดอร์ · ${money(total)}`:'ดำเนินการต่อ'}</button>
        {locationProblem&&<button type="button" onClick={editCart} className="mt-2 w-full rounded-xl border border-line px-3 font-semibold">กลับไปแก้ไขตะกร้า</button>}
        </div>
        <CustomerNavigation active="cart" quantity={quantity} busy={submitting} trackingPath={trackingPath} onMenu={closeCart} onCart={editCart} />
        </div>
        </FormWorkspace>}
      </div>
    </aside>}
    </>
  )
}
