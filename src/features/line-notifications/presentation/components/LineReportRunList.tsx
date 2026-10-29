import type { LineReportRun } from '../../domain/line-notification'

const dateTime = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const labels = { QUEUED: 'รอส่ง', SENDING: 'กำลังส่ง', SENT: 'ส่งสำเร็จ', PARTIAL: 'สำเร็จบางส่วน', FAILED: 'ส่งไม่สำเร็จ', NO_RECIPIENT: 'ไม่มีผู้รับ' }
const reportLabels = { OPENING: 'เปิดร้าน', CLOSING: 'ปิดร้าน', PERIODIC: 'ตามเวลา' }

export function LineReportRunList({ runs }: { runs: LineReportRun[] }) {
  return <section className="rounded-2xl border border-line p-4 sm:col-span-2">
    <h2 className="text-lg font-bold">ประวัติการส่งล่าสุด</h2>
    {!runs.length ? <p className="mt-3 text-sm text-muted">ยังไม่มีรายงาน LINE</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-line"><th className="p-2">เวลา</th><th className="p-2">ประเภท</th><th className="p-2">สถานะ</th><th className="p-2">ผู้รับ</th><th className="p-2">ข้อผิดพลาด</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} className="border-b border-line"><td className="p-2">{dateTime(run.createdAt)}</td><td className="p-2">{reportLabels[run.reportType]}</td><td className="p-2 font-semibold">{labels[run.status]}</td><td className="p-2">{run.sentCount}/{run.recipientCount}</td><td className="max-w-64 truncate p-2 text-red-700" title={run.lastError ?? ''}>{run.lastError ?? '—'}</td></tr>)}</tbody></table></div>}
  </section>
}

