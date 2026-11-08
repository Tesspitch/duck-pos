import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LoadingState } from '../../../../shared/presentation/LoadingState'
import { Icon } from '../../../../shared/presentation/Icon'

import { useCartStore } from '../../application/cart-store'
import { usePublicMenu } from '../../application/use-public-menu'
import { CustomerCart } from '../components/CustomerCart'
import { PublicProductCard } from '../components/PublicProductCard'
import type { TableOrderContext } from '../../../dining/domain/dining'
import { TableServiceButton } from '../../../dining/presentation/TableServiceButton'

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
  const acceptingOrders = menu.data.isOpen && canOrder
  const visibleCategories = menu.data.categories.map((category) => ({ ...category, products: category.products.filter((product) => product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) })).filter((category) => category.products.length > 0)

  return (
    <div className="ordering-page">
      {tableOrder && <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white p-3"><strong>ทานที่ร้าน · {tableOrder.tableName}</strong><div className="flex flex-wrap items-start gap-2"><TableServiceButton tableQrToken={tableOrder.tableQrToken}/><a className="min-h-11 content-center border border-line px-3 text-sm" href={`/table-round/${tableOrder.guestToken}`}>รายการรอบนี้</a></div></div>}
      <header className="customer-shop-header">
        {!tableOrder&&<div className="customer-order-type"><Icon name="bag" size={18}/> สั่งกลับบ้าน · รับที่ร้าน</div>}
        <div className="customer-shop-identity">
          <p className="font-bold text-brand-action">สดใหม่ พร้อมเสิร์ฟ</p>
          {menu.data.logoUrl?<img src={menu.data.logoUrl} alt="โลโก้ร้าน" width="88" height="88"/>:<span className="customer-shop-initial" aria-hidden="true">{menu.data.shopName.slice(0,1)}</span>}
          <h1 className="text-3xl font-black">{menu.data.shopName}</h1>
          <p className={`flex items-center justify-center gap-2 text-sm font-semibold ${acceptingOrders?'text-green-800':'text-red-800'}`}><span className="size-2.5 shrink-0 rounded-full bg-current" aria-hidden="true"/>{acceptingOrders?'เปิดรับออเดอร์ · เลือกเมนูด้านล่างได้เลย':'หยุดรับออเดอร์ · ยังดูเมนูได้'}</p>
        </div>
      </header>
      <main className="customer-menu mx-auto grid max-w-4xl gap-7 p-4 pb-40">
        <label className="customer-menu-search"><Icon name="search"/><span className="sr-only">ค้นหาเมนู</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="วันนี้อยากทานอะไร?" /></label>
        <nav aria-label="หมวดหมู่เมนู" className="customer-menu-categories">{visibleCategories.map(category=><a key={category.id} href={`#category-${category.id}`}><Icon name="menu" size={17}/>{category.name}</a>)}</nav>
        {visibleCategories.map((category) => <section id={`category-${category.id}`} className="scroll-mt-24" key={category.id}><h2 className="mb-3 text-xl font-bold">{category.name}</h2><div className="food-menu-grid">{category.products.map((product) => <PublicProductCard key={product.id} product={product} priority={product.id === firstProductId} />)}</div></section>)}
        {search && visibleCategories.length === 0 && <p className="p-6 text-center text-muted">ไม่พบเมนู ลองค้นหาด้วยชื่ออื่น</p>}
        {menu.data.categories.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-muted">ร้านยังไม่มีเมนูที่แสดง</p> : null}
      </main>
      <CustomerCart shopId={shopId} shopName={menu.data.shopName} shopOpen={acceptingOrders} tableOrder={tableOrder} productImages={Object.fromEntries(menu.data.categories.flatMap((category) => category.products.map((product) => [product.id, product.imageUrl])))} />
    </div>
  )
}

function Message({ title, detail, onRetry, busy }: { title: string; detail: string; onRetry?: () => void; busy?: boolean }) {
  return <main className="grid min-h-screen place-items-center bg-brand-soft p-6"><section className="max-w-md rounded-2xl bg-white p-6 text-center"><h1 className="text-xl font-bold">{title}</h1><p className="mt-2 text-muted">{detail}</p>{onRetry && <button type="button" disabled={busy} onClick={onRetry} className="mt-4 min-h-12 bg-brand-action px-5 font-semibold text-white">{busy ? 'กำลังโหลด…' : 'ลองใหม่'}</button>}</section></main>
}
