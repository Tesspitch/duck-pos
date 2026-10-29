import { useEffect, useMemo, useState } from 'react'

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
  const catalog = useCatalog(shopId)
  const queue = useStaffOrders(shopId)
  const createOrder = useCreatePosOrder(shopId ?? '')
  const { lines, orderNote, requestId, ensureShop, clear } = usePosCartStore()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => { if (shopId) ensureShop(shopId) }, [ensureShop, shopId])
  const categories = useMemo(() => (catalog.data ?? []).filter((category) => category.isVisible), [catalog.data])
  const activeCategory = categories.find((category) => category.id === categoryId) ?? categories[0]

  async function submit() {
    if (!shopId) return
    setSuccess(null)
    const result = await createOrder.mutateAsync({ idempotencyKey: requestId, lines, note: orderNote })
    clear()
    setSuccess(`สร้างออเดอร์สำเร็จ · คิว ${String(result.queueNumber).padStart(3, '0')}`)
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm font-semibold text-brand-action">Phase 4 · Staff POS</p><h1 className="text-2xl font-bold">รับออเดอร์หน้าร้าน</h1><p className="text-sm text-muted">{activeMembership?.shops?.name}</p></div>
          <p className={`rounded-full px-3 py-2 text-sm font-bold ${queue.data?.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'}`}>{queue.data?.isOpen ? 'ร้านเปิด · รับออเดอร์ได้' : 'ร้านปิด · เปิดรอบใน Phase 5'}</p>
        </div>
        {success ? <p role="status" className="mt-4 rounded-xl bg-green-100 p-3 font-semibold text-green-800">{success}</p> : null}
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <nav aria-label="หมวดหมู่สินค้า" className="flex gap-2 overflow-x-auto pb-3">
              {categories.map((category) => <button type="button" key={category.id} onClick={() => setCategoryId(category.id)} className={`whitespace-nowrap rounded-xl border px-4 font-semibold ${activeCategory?.id === category.id ? 'border-brand bg-brand-soft text-brand-action' : 'border-line bg-white'}`}>{category.name}</button>)}
            </nav>
            {catalog.isLoading ? <p className="p-6 text-center">กำลังโหลดเมนู…</p> : null}
            {catalog.error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">โหลดเมนูไม่สำเร็จ</p> : null}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {(activeCategory?.products ?? []).filter((product) => product.isVisible).map((product) => <StaffProductCard key={product.id} product={product} />)}
            </div>
          </section>
          <PosCart disabled={!queue.data?.isOpen} pending={createOrder.isPending} error={createOrder.error ? errorText(createOrder.error) : null} onSubmit={() => void submit()} />
        </div>
      </main>
    </AppShell>
  )
}

