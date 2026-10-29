import type { PropsWithChildren } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../features/auth/application/auth-context'
import { usePlatformAdmin } from '../../features/platform-admin/application/use-platform-admin'
import { useActiveShop } from '../../features/shop-context/application/active-shop-context'

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { activeMembership, memberships, selectShop } = useActiveShop()
  const { data: isPlatformAdmin = false } = usePlatformAdmin()
  const isOwner = activeMembership?.role === 'OWNER'

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex min-h-11 items-center gap-2 text-xl font-bold text-brand-action">
            <span aria-hidden="true">🦆</span> DuckPOS
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2" aria-label="เมนูหลัก">
            {memberships.length > 0 ? (
              <label className="sr-only" htmlFor="active-shop">ร้านที่กำลังใช้งาน</label>
            ) : null}
            {memberships.length > 0 ? (
              <select
                id="active-shop"
                aria-label="ร้านที่กำลังใช้งาน"
                value={activeMembership?.shop_id ?? ''}
                onChange={(event) => selectShop(event.target.value)}
                className="max-w-44 rounded-lg border border-line bg-white px-2 text-sm font-semibold"
              >
                {memberships.map((membership) => (
                  <option key={membership.shop_id} value={membership.shop_id}>
                    {membership.shops?.name ?? membership.shop_id} · {membership.role}
                  </option>
                ))}
              </select>
            ) : null}
            {memberships.length > 0 ? (
              <Link
                to="/pos"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                POS
              </Link>
            ) : null}
            {memberships.length > 0 ? (
              <Link
                to="/queue"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                คิว
              </Link>
            ) : null}
            {memberships.length > 0 ? (
              <Link
                to="/catalog"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                เมนูสินค้า
              </Link>
            ) : null}
            {isPlatformAdmin ? (
              <Link
                to="/admin"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                Platform Admin
              </Link>
            ) : null}
            {isOwner ? (
              <Link
                to="/store"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                เปิด–ปิดร้าน
              </Link>
            ) : null}
            {isOwner ? (
              <Link
                to="/reports"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                รายงาน
              </Link>
            ) : null}
            {isOwner ? (
              <Link
                to="/settings/line"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                LINE
              </Link>
            ) : null}
            {isOwner ? (
              <Link
                to="/create-shop"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                เพิ่มสาขา
              </Link>
            ) : null}
            {isOwner ? (
              <Link
                to="/settings/shop"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                ตั้งค่าร้าน
              </Link>
            ) : null}
            {isOwner ? (
              <Link
                to="/access"
                className="inline-flex items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
              >
                จัดการสิทธิ์
              </Link>
            ) : null}
            <Link
              to="/profile"
              title={user?.email ?? 'โปรไฟล์'}
              className="inline-flex items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink hover:bg-brand-soft"
            >
              {user?.user_metadata.avatar_url ? <img src={user.user_metadata.avatar_url as string} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" /> : null}
              <span className="hidden max-w-44 truncate sm:inline">{user?.email ?? 'โปรไฟล์'}</span>
              <span className="sm:hidden">โปรไฟล์</span>
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-lg border border-line px-3 text-sm font-medium hover:bg-brand-soft"
            >
              ออกจากระบบ
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}

