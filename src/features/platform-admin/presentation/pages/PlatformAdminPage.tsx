import { AppShell } from '../../../../shared/presentation/AppShell'
import { useShopCreationGrants } from '../../application/use-shop-creation-grants'
import { GrantShopForm } from '../components/GrantShopForm'
import { ShopGrantList } from '../components/ShopGrantList'

export function PlatformAdminPage() {
  const { grants, grant, revoke } = useShopCreationGrants()

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold text-brand-action">Platform Admin</p>
          <h1 className="text-2xl font-bold">อนุมัติผู้สร้างร้าน</h1>
          <p className="mt-1 text-sm text-muted">
            กรอก User ID ของผู้ที่ Login Google แล้ว เพื่ออนุญาตให้สร้างร้านของตนเองหนึ่งร้าน
          </p>
        </div>
        <GrantShopForm
          pending={grant.isPending}
          errorMessage={grant.error?.message}
          onGrant={(userId) => grant.mutate(userId)}
        />
        {grants.isError ? <p role="alert" className="mt-4 text-red-700">โหลดรายการไม่สำเร็จ</p> : null}
        {revoke.isError ? <p role="alert" className="mt-4 text-red-700">ถอนสิทธิ์ไม่สำเร็จ: {revoke.error.message}</p> : null}
        <ShopGrantList
          grants={grants.data ?? []}
          loading={grants.isLoading}
          revoking={revoke.isPending}
          onRevoke={(userId) => revoke.mutate(userId)}
        />
      </main>
    </AppShell>
  )
}

