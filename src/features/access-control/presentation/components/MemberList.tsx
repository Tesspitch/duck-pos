import type { Membership } from '../../domain/membership'

interface MemberListProps {
  errorMessage?: string
  loading: boolean
  members: Membership[]
  currentUserId?: string
  revoking: boolean
  onRevoke: (userId: string) => void
}

export function MemberList({
  errorMessage,
  loading,
  members,
  currentUserId,
  revoking,
  onRevoke,
}: MemberListProps) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-line">
      <div className="border-b border-line bg-brand-soft px-4 py-3">
        <h2 className="font-semibold">สมาชิกของร้าน</h2>
      </div>
      {loading ? <p className="p-4 text-muted">กำลังโหลด…</p> : null}
      {errorMessage ? (
        <p role="alert" className="p-4 text-red-700">{errorMessage}</p>
      ) : null}
      <ul className="divide-y divide-line">
        {members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {member.user_profiles?.display_name || member.user_profiles?.email || member.user_id}
              </p>
              <p className="mt-1 break-all text-xs text-muted">{member.user_id}</p>
              <p className="mt-1 text-sm">{member.role} · {member.status}</p>
            </div>
            {member.status === 'ACTIVE' && member.user_id !== currentUserId ? (
              <button
                type="button"
                disabled={revoking}
                onClick={() => onRevoke(member.user_id)}
                className="rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                ถอนสิทธิ์
              </button>
            ) : member.user_id === currentUserId ? (
              <span className="rounded-xl bg-brand-soft px-3 py-2 text-xs font-semibold text-brand-action">
                บัญชีของคุณ
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

