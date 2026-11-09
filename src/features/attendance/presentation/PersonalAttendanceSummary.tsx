import { Icon } from '../../../shared/presentation/Icon'
import { LoadingState } from '../../../shared/presentation/LoadingState'
import { usePersonalAttendance } from '../application/use-attendance'
import { attendanceError, attendanceTimeZone, hoursText, timeEntrySeconds } from '../domain/attendance'

const dateTime = new Intl.DateTimeFormat('th-TH', {
  timeZone: attendanceTimeZone, dateStyle: 'medium', timeStyle: 'short',
})

export function PersonalAttendanceSummary({ shopId }: { shopId: string }) {
  const personal = usePersonalAttendance(shopId)
  if (personal.isPending) return <LoadingState label="กำลังโหลดชั่วโมงและประวัติของคุณ…" />
  if (personal.isError) return <p role="alert" className="text-sm text-red-700">{attendanceError(personal.error)} <button type="button" className="min-h-11 underline" onClick={() => void personal.refetch()}>ลองใหม่</button></p>

  return <>
    <section className="attendance-card attendance-today" aria-label="เวลาทำงานวันนี้">
      <span className="attendance-icon"><Icon name="calendar" /></span>
      <div><h2 className="font-bold">วันนี้</h2><p className="text-sm text-muted">เวลาทำงานของฉันที่สาขานี้</p></div>
      <strong className="attendance-duration">{hoursText(personal.data.todaySeconds)}</strong>
    </section>
    <section className="grid gap-2" aria-labelledby="attendance-recent">
      <h2 id="attendance-recent" className="text-lg font-bold">รายการล่าสุด</h2>
      {personal.data.recent.length === 0 ? <p className="attendance-card text-sm text-muted">ยังไม่มีประวัติลงเวลาที่สาขานี้</p> : <ul className="grid gap-2">
        {personal.data.recent.map(entry => <li key={entry.id} className="attendance-card attendance-entry">
          <div className="min-w-0 divide-y divide-line">
            <div className="attendance-entry-event">
              <span className="attendance-icon is-green"><Icon name="login" size={18} /></span>
              <div><p className="font-bold">เข้า</p><time dateTime={entry.clockedInAt} className="text-sm text-muted">{dateTime.format(new Date(entry.clockedInAt))}</time></div>
            </div>
            <div className="attendance-entry-event">
              <span className="attendance-icon"><Icon name="logout" size={18} /></span>
              <div><p className="font-bold">ออก</p>{entry.clockedOutAt
                ? <time dateTime={entry.clockedOutAt} className="text-sm text-muted">{dateTime.format(new Date(entry.clockedOutAt))}</time>
                : <span className="text-sm text-muted">ยังไม่ได้ลงเวลาออก</span>}</div>
            </div>
          </div>
          <strong className="attendance-duration">{entry.clockedOutAt ? hoursText(timeEntrySeconds(entry, Date.parse(entry.clockedOutAt))) : 'กำลังทำงาน'}</strong>
        </li>)}
      </ul>}
    </section>
  </>
}
