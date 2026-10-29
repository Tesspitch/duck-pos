import type { LineSubscription, LineSubscriptionStatus } from '../../domain/line-notification'

interface Props {
  subscriptions: LineSubscription[]
  pending: boolean
  onChange: (id: string, status: Extract<LineSubscriptionStatus, 'APPROVED' | 'REVOKED'>) => Promise<void>
}

const statusLabel = { PENDING: 'รออนุมัติ', APPROVED: 'อนุมัติแล้ว', REVOKED: 'ยกเลิกสิทธิ์' }

export function LineSubscriberList({ subscriptions, pending, onChange }: Props) {
  return <section className="rounded-2xl border border-line p-4">
    <h2 className="text-lg font-bold">ผู้รับรายงาน</h2>
    {!subscriptions.length ? <p className="mt-3 text-sm text-muted">ยังไม่มีคำขอ ให้ผู้รับเพิ่ม LINE OA และส่ง Shop ID ทางแชท</p> : <div className="mt-3 space-y-3">
      {subscriptions.map((subscription) => <article key={subscription.id} className="rounded-xl bg-brand-soft p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="font-semibold">{subscription.displayName ?? 'ผู้ใช้ LINE'}</p><p className="text-xs text-muted">{subscription.lineUserHint} · {statusLabel[subscription.status]}</p></div>
          <div className="flex gap-2">
            {subscription.status !== 'APPROVED' ? <button disabled={pending} type="button" onClick={() => onChange(subscription.id, 'APPROVED')} className="rounded-lg bg-green-700 px-3 font-semibold text-white disabled:opacity-50">อนุมัติ</button> : null}
            {subscription.status !== 'REVOKED' ? <button disabled={pending} type="button" onClick={() => onChange(subscription.id, 'REVOKED')} className="rounded-lg border border-red-200 px-3 text-red-700 disabled:opacity-50">ถอนสิทธิ์</button> : null}
          </div>
        </div>
      </article>)}
    </div>}
  </section>
}

