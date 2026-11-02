import { Icon } from '../../../../shared/presentation/Icon'
import { AppShell } from '../../../../shared/presentation/AppShell'
import { ManagementSection } from '../../../../shared/presentation/ManagementSection'
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
          <p className="text-sm font-semibold text-brand-action">ทีมงานประจำร้าน</p>
          <h1 className="text-2xl font-bold"><Icon name="users" /> พนักงาน</h1>
          <p className="mt-1 text-sm text-muted">
            {activeMembership?.shops?.name} · ผู้ใช้ต้องเข้าสู่ระบบ Google อย่างน้อยหนึ่งครั้งก่อนนำ User ID มาเพิ่ม
          </p>
        </div>

        <ManagementSection title="เพิ่มสมาชิกหรือปรับบทบาท" description="ให้สมาชิกเข้าสู่ระบบและส่ง User ID มา จากนั้นกรอก ID เลือกบทบาท แล้วกดเพิ่ม/อัปเดต">
        <MemberForm
          pending={grantMember.isPending}
          errorMessage={grantMember.error?.message}
          onSubmit={(values) => grantMember.mutate(values)}
        />
        </ManagementSection>
        {grantMember.isSuccess && <p role="status" className="mt-4 border border-green-200 bg-green-50 p-4 text-green-800">บันทึกสิทธิ์แล้ว สมาชิกสามารถกลับเข้าร้านได้</p>}
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

