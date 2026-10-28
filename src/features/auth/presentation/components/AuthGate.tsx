import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useMemberships } from '../../../access-control/application/use-memberships'
import { usePlatformAdmin } from '../../../platform-admin/application/use-platform-admin'
import { useShopCreationAccess } from '../../../shop-onboarding/application/use-shop-creation-access'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useAuth } from '../../application/auth-context'

interface AuthGateProps extends PropsWithChildren {
  requireMembership?: boolean
  requireOwner?: boolean
  requirePlatformAdmin?: boolean
  requireShopCreation?: boolean
  requireShopCreationOrOwner?: boolean
}

export function AuthGate({
  children,
  requireMembership = true,
  requireOwner = false,
  requirePlatformAdmin = false,
  requireShopCreation = false,
  requireShopCreationOrOwner = false,
}: AuthGateProps) {
  const location = useLocation()
  const { loading: authLoading, user } = useAuth()
  const memberships = useMemberships()
  const platformAdmin = usePlatformAdmin()
  const shopCreationAccess = useShopCreationAccess()
  const { activeMembership } = useActiveShop()

  if (
    authLoading
    || (user && (memberships.isLoading || platformAdmin.isLoading || shopCreationAccess.isLoading))
  ) {
    return <FullPageMessage title="กำลังตรวจสอบสิทธิ์…" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (memberships.isError || platformAdmin.isError || shopCreationAccess.isError) {
    return (
      <FullPageMessage
        title="ตรวจสอบสิทธิ์ไม่สำเร็จ"
        detail="กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่"
      />
    )
  }

  const activeMemberships = memberships.data ?? []
  const isPlatformAdmin = platformAdmin.data === true
  const hasShopCreationGrant = shopCreationAccess.data?.status === 'ACTIVE'

  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/" replace />
  }

  if (requireShopCreation && !hasShopCreationGrant) {
    return <Navigate to="/" replace />
  }

  if (requireShopCreationOrOwner && !hasShopCreationGrant && activeMembership?.role !== 'OWNER') {
    return <Navigate to="/" replace />
  }

  if (requireMembership && activeMemberships.length === 0) {
    if (isPlatformAdmin) return <Navigate to="/admin" replace />
    if (hasShopCreationGrant) return <Navigate to="/create-shop" replace />
    return <Navigate to="/pending" replace />
  }

  if (requireOwner && activeMembership?.role !== 'OWNER') {
    return <Navigate to="/" replace />
  }

  return children
}

function FullPageMessage({ title, detail }: { title: string; detail?: string }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="text-center">
        <p className="text-lg font-semibold">{title}</p>
        {detail ? <p className="mt-2 text-muted">{detail}</p> : null}
      </section>
    </main>
  )
}

