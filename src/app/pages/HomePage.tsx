import { Icon } from '../../shared/presentation/Icon'
import { Link } from 'react-router-dom'

import { AppShell } from '../../shared/presentation/AppShell'
import { useActiveShop } from '../../features/shop-context/application/active-shop-context'
import { HomeStoreControl } from '../../features/store-management/presentation/components/HomeStoreControl'

export function HomePage() {
  const { activeMembership: membership } = useActiveShop()

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <section className="home-overview">
          <p className="page-eyebrow">ภาพรวมร้าน</p>
          <h1 className="mt-1 text-2xl font-bold">เริ่มรอบขายของคุณ</h1>
          <p className="mt-2 text-sm text-muted">{membership?.shops?.name}</p>
          {membership && <HomeStoreControl key={membership.shop_id} shopId={membership.shop_id} />}
          <h2 className="mt-7 text-lg font-bold">งานหน้าร้าน</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link to="/pos" className="home-primary-action home-action-card"><span className="home-action-icon" aria-hidden="true"><Icon name="bag" /></span><span><small>01</small><strong>รับออเดอร์</strong></span><span aria-hidden="true">→</span></Link>
            <Link to="/queue" className="home-action-card"><span className="home-action-icon" aria-hidden="true"><Icon name="queue" /></span><span><small>02</small><strong>คิวและรับเงิน</strong></span><span aria-hidden="true">→</span></Link>
            <Link to="/catalog" className="home-action-card"><span className="home-action-icon" aria-hidden="true"><Icon name="menu" /></span><span><small>จัดการร้าน</small><strong>เมนูสินค้า</strong></span><span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
    </AppShell>
  )
}

