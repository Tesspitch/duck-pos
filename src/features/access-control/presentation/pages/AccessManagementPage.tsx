import { AppShell } from '../../../../shared/presentation/AppShell'
import { useAuth } from '../../../auth/application/auth-context'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useAccessManagement } from '../../application/use-access-management'
import { MemberForm } from '../components/MemberForm'
import { MemberList } from '../components/MemberList'

export function AccessManagementPage() {
  const { user } = useAuth()
  const { activeMembership } = useActiveShop()
  const { members, grantMember, revokeMember } = useAccessManagement(activeMembership?.shop_id)

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold text-brand-action">Owner only</p>
          <h1 className="text-2xl font-bold">จัดการสิทธิ์พนักงาน</h1>
          <p className="mt-1 text-sm text-muted">
            {activeMembership?.shops?.name} · ผู้ใช้ต้องเข้าสู่ระบบ Google อย่างน้อยหนึ่งครั้งก่อนนำ User ID มาเพิ่ม
          </p>
        </div>

        <MemberForm
          pending={grantMember.isPending}
          errorMessage={grantMember.error?.message}
          onSubmit={(values) => grantMember.mutate(values)}
        />
        <MemberList
          loading={members.isLoading}
          errorMessage={
            members.isError
              ? 'โหลดสมาชิกไม่สำเร็จ'
              : revokeMember.error
                ? `ถอนสิทธิ์ไม่สำเร็จ: ${revokeMember.error.message}`
                : undefined
          }
          members={members.data ?? []}
          currentUserId={user?.id}
          revoking={revokeMember.isPending}
          onRevoke={(userId) => revokeMember.mutate(userId)}
        />
      </main>
    </AppShell>
  )
}

