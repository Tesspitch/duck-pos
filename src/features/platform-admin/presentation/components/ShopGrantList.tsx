import type { ShopCreationGrant } from '../../domain/shop-creation-grant'

interface ShopGrantListProps {
  grants: ShopCreationGrant[]
  loading: boolean
  revoking: boolean
  onRevoke: (userId: string) => void
}

export function ShopGrantList({ grants, loading, revoking, onRevoke }: ShopGrantListProps) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-line">
      <div className="border-b border-line bg-brand-soft px-4 py-3">
        <h2 className="font-semibold">สิทธิ์สร้างร้าน</h2>
      </div>
      {loading ? <p className="p-4 text-muted">กำลังโหลด…</p> : null}
      {!loading && grants.length === 0 ? <p className="p-4 text-muted">ยังไม่มีรายการ</p> : null}
      <ul className="divide-y divide-line">
        {grants.map((grant) => (
          <li key={grant.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {grant.user_profiles?.display_name || grant.user_profiles?.email || grant.user_id}
              </p>
              <p className="mt-1 break-all text-xs text-muted">{grant.user_id}</p>
              <p className="mt-1 text-sm">สถานะ: {grant.status}</p>
            </div>
            {grant.status === 'ACTIVE' ? (
              <button
                type="button"
                disabled={revoking}
                onClick={() => onRevoke(grant.user_id)}
                className="rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                ถอนสิทธิ์
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

