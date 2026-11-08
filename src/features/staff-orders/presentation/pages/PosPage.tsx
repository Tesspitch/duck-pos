import { Icon } from '../../../../shared/presentation/Icon'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LoadingState } from '../../../../shared/presentation/LoadingState'
import { FlowGuide } from '../../../../shared/presentation/FlowGuide'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'
import { posCartTotal } from '../../domain/pos-cart'

import { AppShell } from '../../../../shared/presentation/AppShell'
import { useCatalog } from '../../../catalog/application/use-catalog'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useCreatePosOrder } from '../../application/use-staff-order-actions'
import { usePosCartStore } from '../../application/pos-cart-store'
import { useStaffOrders } from '../../application/use-staff-orders'
import { PosCart } from '../components/PosCart'
import { StaffProductCard } from '../components/StaffProductCard'

const errorText = (error: unknown) => error instanceof Error ? error.message : 'ไม่สามารถสร้างออเดอร์ได้'

export function PosPage() {
  const { activeMembership } = useActiveShop()
  const shopId = activeMembership?.shop_id
  const [params] = useSearchParams()
  const tableBillId = params.get('tableBill') ?? undefined
  const tableName = params.get('tableName') ?? 'โต๊ะ'
  const catalog = useCatalog(shopId)
  const queue = useStaffOrders(shopId)
  const createOrder = useCreatePosOrder(shopId ?? '')
  const { lines, orderNote, requestId, ensureShop, clear } = usePosCartStore()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const submitLock = useRef(false)

  useEffect(() => { if (shopId) ensureShop(tableBillId ? shopId+':table:'+tableBillId : shopId) }, [ensureShop, shopId, tableBillId])
  const categories = useMemo(() => (catalog.data ?? []).filter((category) => category.isVisible), [catalog.data])
  const activeCategory = categories.find((category) => category.id === categoryId)
  const products = (search.trim() || !activeCategory ? categories.flatMap((category) => category.products) : activeCategory.products).filter((product) => product.isVisible && product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const accepting = queue.data?.isOpen === true
  const statusLabel = queue.isLoading ? 'กำลังตรวจสอบสถานะร้าน…' : queue.error ? 'ตรวจสอบสถานะร้านไม่สำเร็จ' : accepting ? 'ร้านเปิดรับออเดอร์' : 'ร้านยังไม่รับออเดอร์'

  async function submit() {
    if (!shopId || submitLock.current || !lines.length || !queue.data?.isOpen) return
    submitLock.current = true
    setSuccess(null)
    let result
    try { result = await createOrder.mutateAsync({ idempotencyKey: requestId, lines, note: orderNote, ...(tableBillId ? { tableBillId } : {}) }) }
    catch { return }
    finally { submitLock.current = false }
    clear()
    setCartOpen(false)
    setSuccess(`สร้างออเดอร์สำเร็จ · คิว ${String(result.queueNumber).padStart(3, '0')}`)
  }

  return (
    <AppShell>
      <main className={`pos-page pos-order-screen mx-auto max-w-7xl p-4 sm:p-6${lines.length?' pos-has-cart':''}`}>
        {tableBillId && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-brand-action bg-brand-soft p-3"><strong>เพิ่มอาหารให้ {tableName} · รวมบิลโต๊ะ</strong><Link className="min-h-11 content-center border border-line bg-white px-3" to={`/tables?bill=${tableBillId}`}>กลับไปที่บิล</Link></div>}
        <header className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-action"><Icon name="bag" size={28}/></span><div><h1 className="text-2xl font-bold">รับออเดอร์</h1><p className="text-sm text-muted">{tableBillId ? 'เพิ่มรายการในบิลโต๊ะ' : 'รับออเดอร์ลูกค้าที่มาสั่งหน้าร้าน'}</p></div></header>
        <div className={`pos-intake-banner ${accepting&&!queue.error?'is-accepting':''}`}>
          <span className="pos-intake-icon"><Icon name={accepting&&!queue.error?'check':'store'} size={20}/></span>
          <div className="min-w-0 flex-1"><p className="font-bold">{statusLabel}</p>{accepting&&!queue.error&&<p className="text-xs text-muted">เพิ่มรายการและออกเลขคิวได้ตามปกติ</p>}</div>
          {queue.error?<button type="button" className="pos-intake-link" onClick={()=>void queue.refetch()}>ลองใหม่</button>:queue.data&&<Link to="/" className="pos-intake-link">{accepting?'จัดการร้าน':'ดูสถานะร้าน'}</Link>}
        </div>
        <FlowGuide steps={['เลือกเมนู', 'ตรวจสอบออเดอร์', 'รับเลขคิว']} current={cartOpen ? 1 : success && lines.length===0 ? 2 : 0} />
        {success ? <div className="mt-4 border border-green-200 bg-green-50 p-4"><p role="status" className="font-semibold text-green-800">{success}</p><Link to="/queue" className="mt-3 inline-flex min-h-12 items-center bg-brand px-4 font-bold text-ink">ไปจัดการคิวและรับเงิน →</Link></div> : null}
        <label className="customer-menu-search"><Icon name="search"/><span className="sr-only">ค้นหาสินค้าทุกหมวด</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาเมนูที่ต้องการ" /></label>
        {lines.length > 0 && <div className="pos-floating-cart pos-review-bar"><div className="flex min-w-0 items-center gap-2"><Icon name="bag" className="shrink-0 text-brand-action"/><div><p className="text-xs font-semibold">เลือกแล้ว {lines.reduce((count,line)=>count+line.quantity,0)} ชิ้น</p><strong className="text-sm">฿{(posCartTotal(lines) / 100).toFixed(2)}</strong></div></div><button type="button" className="pos-review-button" aria-haspopup="dialog" aria-expanded={cartOpen} onClick={() => setCartOpen(true)}>ตรวจสอบออเดอร์ <Icon name="arrow" size={16}/></button></div>}
        <div className="mt-5">
          <section>
            <nav aria-label="หมวดหมู่สินค้า" className="pos-chips pos-category-chips pb-3">
              <button type="button" aria-pressed={!activeCategory||!!search.trim()} onClick={() => setCategoryId(null)}>ทั้งหมด</button>
              {categories.map((category) => <button type="button" key={category.id} aria-pressed={!search.trim()&&activeCategory?.id===category.id} onClick={() => {setCategoryId(category.id);setSearch('')}}>{category.name}</button>)}
            </nav>
            {catalog.isLoading ? <LoadingState label="กำลังโหลดเมนู…" /> : null}
            {catalog.error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">โหลดเมนูไม่สำเร็จ</p> : null}
            {!catalog.isLoading && !catalog.error && products.length === 0 && <p className="border border-dashed border-line bg-white p-8 text-center text-muted">ไม่พบเมนู ลองเลือกหมวดอื่นหรือเปลี่ยนคำค้นหา</p>}
            <div className="pos-product-grid">
              {products.map((product) => <StaffProductCard key={product.id} product={product} />)}
            </div>
          </section>
          {cartOpen && lines.length > 0 && <FormWorkspace title="ยืนยันรายการหน้าร้าน" busy={createOrder.isPending} onBack={() => setCartOpen(false)}><PosCart onEmpty={() => setCartOpen(false)} productImages={Object.fromEntries((catalog.data ?? []).flatMap((category) => category.products.map((product) => [product.id, product.imageUrl])))} disabled={!queue.data?.isOpen} pending={createOrder.isPending} error={createOrder.error ? errorText(createOrder.error) : null} onSubmit={() => void submit()} /></FormWorkspace>}
        </div>
      </main>
    </AppShell>
  )
}

