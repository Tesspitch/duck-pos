import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { useCartStore } from '../../application/cart-store'
import { usePublicMenu } from '../../application/use-public-menu'
import { CustomerCart } from '../components/CustomerCart'
import { PublicProductCard } from '../components/PublicProductCard'

export function PublicMenuPage() {
  const { shopId } = useParams()
  const ensureShop = useCartStore((state) => state.ensureShop)
  const menu = usePublicMenu(shopId)

  useEffect(() => { if (shopId) ensureShop(shopId) }, [ensureShop, shopId])

  if (menu.isLoading) return <main className="grid min-h-screen place-items-center bg-brand-soft p-6"><p className="font-semibold">กำลังโหลดเมนู…</p></main>
  if (menu.isError) return <Message title="โหลดเมนูไม่สำเร็จ" detail={menu.error.message} />
  if (!shopId || !menu.data) return <Message title="ไม่พบร้าน" detail="กรุณาสแกน QR Code ของร้านอีกครั้ง" />
  const firstProductId = menu.data.categories.flatMap((category) => category.products)[0]?.id

  return (
    <div className="min-h-screen bg-brand-soft">
      <header className="border-b border-line bg-white"><div className="mx-auto flex max-w-4xl items-center gap-3 p-4">{menu.data.logoUrl ? <img src={menu.data.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <span className="text-3xl">🦆</span>}<div><h1 className="text-xl font-bold">{menu.data.shopName}</h1><p className={`text-sm font-semibold ${menu.data.isOpen ? 'text-green-700' : 'text-red-700'}`}>{menu.data.isOpen ? 'เปิดรับออเดอร์' : 'ร้านปิดอยู่'}</p></div></div></header>
      <main className="mx-auto grid max-w-4xl gap-7 p-4 pb-40">
        {menu.data.categories.map((category) => <section key={category.id}><h2 className="mb-3 text-xl font-bold">{category.name}</h2><div className="grid gap-4 sm:grid-cols-2">{category.products.map((product) => <PublicProductCard key={product.id} product={product} priority={product.id === firstProductId} />)}</div></section>)}
        {menu.data.categories.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-muted">ร้านยังไม่มีเมนูที่แสดง</p> : null}
      </main>
      <CustomerCart shopId={shopId} shopOpen={menu.data.isOpen} />
    </div>
  )
}

function Message({ title, detail }: { title: string; detail: string }) {
  return <main className="grid min-h-screen place-items-center bg-brand-soft p-6"><section className="max-w-md rounded-2xl bg-white p-6 text-center"><h1 className="text-xl font-bold">{title}</h1><p className="mt-2 text-muted">{detail}</p></section></main>
}
