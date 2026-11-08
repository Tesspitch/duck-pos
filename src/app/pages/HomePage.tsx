import { Icon } from '../../shared/presentation/Icon'
import { Link } from 'react-router-dom'

import { AppShell } from '../../shared/presentation/AppShell'
import { useActiveShop } from '../../features/shop-context/application/active-shop-context'
import { HomeStoreControl } from '../../features/store-management/presentation/components/HomeStoreControl'
import { HomeActivity } from './HomeActivity'

export function HomePage() {
  const { activeMembership: membership } = useActiveShop()

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <section className="grid gap-5">
          <header><h1 className="text-2xl font-bold">ภาพรวมร้าน</h1><p className="mt-1 text-sm text-muted">สถานะร้านและงานที่ต้องจัดการวันนี้</p></header>
          {membership && <HomeStoreControl key={membership.shop_id} shopId={membership.shop_id} />}
          {membership && <HomeActivity key={membership.shop_id} shopId={membership.shop_id} owner={membership.role==='OWNER'}/>}
          <section aria-labelledby="home-shortcuts"><h2 id="home-shortcuts" className="mb-3 text-lg font-bold">เมนูด่วน</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {([{to:'/catalog',label:'เมนูสินค้า',icon:'menu'},{to:'/tables',label:'โต๊ะและบิล',icon:'store'},{to:'/queue?view=history',label:'ประวัติออเดอร์',icon:'clock'}] as const).map(({to,label,icon})=>(
                <Link key={to} to={to} className="grid min-h-22 min-w-0 content-center justify-items-center gap-2 rounded-xl border border-line bg-white px-2 py-3 text-center text-sm font-semibold hover:border-brand"><Icon name={icon} size={23}/><span>{label}</span></Link>
              ))}
            </div>
          </section>
        </section>
      </main>
    </AppShell>
  )
}

