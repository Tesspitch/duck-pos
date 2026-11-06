import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LoadingState } from '../../../../shared/presentation/LoadingState'

import { useCartStore } from '../../application/cart-store'
import { usePublicMenu } from '../../application/use-public-menu'
import { CustomerCart } from '../components/CustomerCart'
import { PublicProductCard } from '../components/PublicProductCard'
import type { TableOrderContext } from '../../../dining/domain/dining'

export function PublicMenuPage() {
  const { shopId } = useParams()
  return <PublicMenuView shopId={shopId} />
}

export function PublicMenuView({ shopId, tableOrder, canOrder=true }: { shopId: string | undefined; tableOrder?: TableOrderContext; canOrder?: boolean }) {
  const ensureShop = useCartStore((state) => state.ensureShop)
  const menu = usePublicMenu(shopId)
  const [search, setSearch] = useState('')

  useEffect(() => { if (shopId) ensureShop(tableOrder ? `${shopId}:table:${tableOrder.tableEpoch??tableOrder.billId}` : shopId) }, [ensureShop, shopId, tableOrder])

  if (menu.isLoading) return <main className="grid min-h-screen place-items-center bg-brand-soft p-6"><LoadingState label="กำลังโหลดเมนู…" /></main>
  if (menu.isError) return <Message title="โหลดเมนูไม่สำเร็จ" detail={menu.error.message} onRetry={() => void menu.refetch()} busy={menu.isFetching} />
  if (!shopId || !menu.data) return <Message title="ไม่พบร้าน" detail="กรุณาสแกน QR Code ของร้านอีกครั้ง" />
  const firstProductId = menu.data.categories.flatMap((category) => category.products)[0]?.id
  const cover = menu.data.categories.flatMap((category) => category.products).find((product) => product.imageUrl)?.imageUrl
  const visibleCategories = menu.data.categories.map((category) => ({ ...category, products: category.products.filter((product) => product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) })).filter((category) => category.products.length > 0)

  return (
    <div className="ordering-page">
      {tableOrder && <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-white p-3"><strong>ทานที่ร้าน · {tableOrder.tableName}</strong><a className="min-h-11 content-center border border-line px-3 text-sm" href={`/table-round/${tableOrder.guestToken}`}>รายการรอบนี้</a></div>}
      <header className="restaurant-header"><div className="restaurant-cover">{cover ? <img src={cover} alt="" fetchPriority="high" /> : <span>สดใหม่ พร้อมเสิร์ฟ</span>}<span className="takeaway-label">{tableOrder ? `ทานที่ร้าน · ${tableOrder.tableName}` : 'สั่งกลับบ้าน · รับที่ร้าน'}</span></div><div className="restaurant-identity">{menu.data.logoUrl ? <img src={menu.data.logoUrl} alt="โลโก้ร้าน" /> : <span className="restaurant-monogram">{menu.data.shopName.slice(0,1)}</span>}<h1>{menu.data.shopName}</h1><p className={menu.data.isOpen ? 'text-green-700' : 'text-red-700'}>{menu.data.isOpen ? 'เปิดรับออเดอร์ · เลือกเมนูด้านล่างได้เลย' : 'ร้านปิดอยู่ · ดูเมนูได้ แต่ยังสั่งไม่ได้'}</p></div></header>
      <nav aria-label="หมวดหมู่เมนู" className="sticky top-0 z-20 border-b border-line bg-white"><div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto p-3">{menu.data.categories.map((category) => <a key={category.id} href={`#category-${category.id}`} className="inline-flex shrink-0 items-center rounded-full bg-brand-soft px-5 font-semibold text-brand-action">{category.name}</a>)}</div></nav>
      <main className="customer-menu mx-auto grid max-w-4xl gap-7 p-4 pb-40">
        <label className="grid gap-2 text-sm font-semibold">ค้นหาเมนู<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="วันนี้อยากทานอะไร?" className="border border-line bg-white px-4" /></label>
        {visibleCategories.map((category) => <section id={`category-${category.id}`} className="scroll-mt-24" key={category.id}><h2 className="mb-3 text-xl font-bold">{category.name}</h2><div className="food-menu-grid">{category.products.map((product) => <PublicProductCard key={product.id} product={product} priority={product.id === firstProductId} />)}</div></section>)}
        {search && visibleCategories.length === 0 && <p className="p-6 text-center text-muted">ไม่พบเมนู ลองค้นหาด้วยชื่ออื่น</p>}
        {menu.data.categories.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-muted">ร้านยังไม่มีเมนูที่แสดง</p> : null}
      </main>
      <CustomerCart shopId={shopId} shopOpen={menu.data.isOpen&&canOrder} tableOrder={tableOrder} productImages={Object.fromEntries(menu.data.categories.flatMap((category) => category.products.map((product) => [product.id, product.imageUrl])))} />
    </div>
  )
}

function Message({ title, detail, onRetry, busy }: { title: string; detail: string; onRetry?: () => void; busy?: boolean }) {
  return <main className="grid min-h-screen place-items-center bg-brand-soft p-6"><section className="max-w-md rounded-2xl bg-white p-6 text-center"><h1 className="text-xl font-bold">{title}</h1><p className="mt-2 text-muted">{detail}</p>{onRetry && <button type="button" disabled={busy} onClick={onRetry} className="mt-4 min-h-12 bg-brand-action px-5 font-semibold text-white">{busy ? 'กำลังโหลด…' : 'ลองใหม่'}</button>}</section></main>
}
