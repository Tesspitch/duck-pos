import { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../../../auth/application/auth-context'
import { usePlatformAdmin } from '../../../platform-admin/application/use-platform-admin'
import { useShopCreationAccess } from '../../../shop-onboarding/application/use-shop-creation-access'
import { useMemberships } from '../../application/use-memberships'

export function PendingAccessPage() {
  const { user, signOut } = useAuth()
  const memberships = useMemberships()
  const platformAdmin = usePlatformAdmin()
  const shopCreationAccess = useShopCreationAccess()
  const [copied, setCopied] = useState(false)

  if ((memberships.data?.length ?? 0) > 0) return <Navigate to="/" replace />
  if (platformAdmin.data) return <Navigate to="/admin" replace />
  if (shopCreationAccess.data?.status === 'ACTIVE') return <Navigate to="/create-shop" replace />
  if (!user) return null

  async function copyUserId() {
    await navigator.clipboard.writeText(user!.id)
    setCopied(true)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-soft p-4">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-white p-6">
        <p className="text-3xl" aria-hidden="true">⏳</p>
        <h1 className="mt-3 text-2xl font-bold">รอเจ้าของร้านอนุมัติ</h1>
        <p className="mt-2 text-muted">
          ส่ง Supabase User ID ด้านล่างให้เจ้าของร้านเพื่อเพิ่มสิทธิ์ Staff หรือ Owner
        </p>
        <div className="mt-5 rounded-xl border border-line bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase text-muted">Supabase User ID</p>
          <code className="mt-1 block break-all text-sm">{user.id}</code>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void copyUserId()}
            className="rounded-xl bg-brand-action px-4 font-semibold text-white hover:bg-orange-800"
          >
            {copied ? 'คัดลอกแล้ว' : 'คัดลอก User ID'}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl border border-line px-4 font-semibold hover:bg-brand-soft"
          >
            ออกจากระบบ
          </button>
        </div>
      </section>
    </main>
  )
}

