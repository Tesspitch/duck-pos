import type { StoreSessionHistory as HistoryItem } from '../../domain/store-session'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`
const time = (value: string | null) => value
  ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'ยังไม่ปิด'

export function StoreSessionHistory({ sessions }: { sessions: HistoryItem[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-xl font-bold">ประวัติรอบร้าน</h2>
      {sessions.length === 0 ? <p className="mt-3 rounded-xl bg-brand-soft p-4 text-muted">ยังไม่มีประวัติรอบร้าน</p> : null}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
        {sessions.length ? <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-brand-soft"><tr><th className="p-3">วันทำการ</th><th className="p-3">เปิด</th><th className="p-3">ปิด</th><th className="p-3">ออเดอร์</th><th className="p-3">เสร็จสิ้น</th><th className="p-3 text-right">รับเงินจริง</th></tr></thead>
          <tbody>{sessions.map((session) => <tr key={session.id} className="border-t border-line"><td className="p-3 font-semibold">{session.businessDate}</td><td className="p-3">{time(session.openedAt)}<span className="block text-xs text-muted">{session.openedBy ?? '-'}</span></td><td className="p-3">{time(session.closedAt)}<span className="block text-xs text-muted">{session.closedBy ?? '-'}</span></td><td className="p-3">{session.orderCount}</td><td className="p-3">{session.completedOrderCount}</td><td className="p-3 text-right font-semibold">{money(session.collectedSatang)}</td></tr>)}</tbody>
        </table> : null}
      </div>
    </section>
  )
}

