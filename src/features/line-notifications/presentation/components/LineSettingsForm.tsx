import { useState } from 'react'

import { normalizeReportTimes, type LineNotificationSettings } from '../../domain/line-notification'

interface Props {
  settings: LineNotificationSettings
  pending: boolean
  onSave: (settings: LineNotificationSettings) => Promise<void>
}

export function LineSettingsForm({ settings, pending, onSave }: Props) {
  const [closing, setClosing] = useState(settings.closingReportEnabled)
  const [periodic, setPeriodic] = useState(settings.periodicReportEnabled)
  const [times, setTimes] = useState(settings.reportTimes)

  function addTime() { if (times.length < 6) setTimes([...times, '12:00']) }

  return <section className="rounded-2xl border border-line p-4">
    <h2 className="text-lg font-bold">ตั้งเวลารายงาน</h2>
    <label className="mt-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={closing} onChange={(event) => setClosing(event.target.checked)} /> ส่งรายงานเมื่อปิดร้าน</label>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={periodic} onChange={(event) => setPeriodic(event.target.checked)} /> ส่งรายงานสะสมตามเวลา</label>
    {periodic ? <div className="mt-3 space-y-2">
      <p className="text-sm text-muted">เวลาตาม timezone ของร้าน สูงสุด 6 รอบต่อวัน</p>
      {times.map((time, index) => <div key={`${index}-${time}`} className="flex gap-2">
        <input aria-label={`เวลารายงานรอบที่ ${index + 1}`} type="time" value={time} onChange={(event) => setTimes(times.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="rounded-lg border border-line px-3" />
        <button type="button" onClick={() => setTimes(times.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-red-200 px-3 text-red-700">ลบ</button>
      </div>)}
      <button type="button" disabled={times.length >= 6} onClick={addTime} className="rounded-lg border border-line px-3 disabled:opacity-50">เพิ่มเวลา</button>
    </div> : null}
    <button type="button" disabled={pending || (periodic && normalizeReportTimes(times).length === 0)} onClick={() => onSave({ closingReportEnabled: closing, periodicReportEnabled: periodic, reportTimes: normalizeReportTimes(times) })} className="mt-4 w-full rounded-xl bg-brand-action px-4 font-bold text-white disabled:opacity-50">{pending ? 'กำลังบันทึก…' : 'บันทึกการแจ้งเตือน'}</button>
  </section>
}

