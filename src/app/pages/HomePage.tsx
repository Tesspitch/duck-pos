import { Link } from 'react-router-dom'

import { AppShell } from '../../shared/presentation/AppShell'
import { useActiveShop } from '../../features/shop-context/application/active-shop-context'

export function HomePage() {
  const { activeMembership: membership } = useActiveShop()

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <section className="rounded-2xl border border-line bg-white p-6">
          <p className="text-sm font-semibold text-brand-action">DuckPOS</p>
          <h1 className="mt-1 text-2xl font-bold">จัดการร้าน {membership?.shops?.name ?? ''}</h1>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-brand-soft p-4">
              <dt className="text-sm text-muted">ร้าน</dt>
              <dd className="mt-1 font-semibold">{membership?.shops?.name ?? 'ไม่พบชื่อร้าน'}</dd>
            </div>
            <div className="rounded-xl bg-brand-soft p-4">
              <dt className="text-sm text-muted">สิทธิ์</dt>
              <dd className="mt-1 font-semibold">{membership?.role ?? '-'}</dd>
            </div>
          </dl>
          <Link to="/catalog" className="mt-5 inline-flex rounded-lg bg-brand-action px-4 font-semibold text-white">
            จัดการเมนูสินค้า
          </Link>
        </section>
      </main>
    </AppShell>
  )
}

