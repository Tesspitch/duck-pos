import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../../shared/presentation/AppShell'
import { Icon } from '../../../shared/presentation/Icon'
import { LoadingState } from '../../../shared/presentation/LoadingState'
import { useActiveShop } from '../../shop-context/application/active-shop-context'
import { validateDateRange } from '../../sales-analytics/domain/sales-report'
import { useAttendanceReport } from '../application/use-attendance'
import { attendanceDate, attendanceError, attendanceTimeZone, hoursText, type HoursBucket, type HoursFilter } from '../domain/attendance'

import { AttendanceClockCard } from './AttendanceClockCard'
import { PersonalAttendanceSummary } from './PersonalAttendanceSummary'

const field = 'min-h-12 w-full min-w-0 max-w-full border border-line bg-white px-3'
export function AttendancePage() {
  const { activeMembership } = useActiveShop()
  const shopId = activeMembership?.shop_id ?? ''
  return <AppShell><AttendanceWorkspace key={shopId} shopId={shopId} shopName={activeMembership?.shops?.name} owner={activeMembership?.role === 'OWNER'} /></AppShell>
}

export function AttendanceWorkspace({ shopId, shopName, owner }: { shopId: string; shopName?: string; owner: boolean }) {
  const [filter, setFilter] = useState<HoursFilter>(() => {
    const today = attendanceDate.format(new Date())
    return { dateFrom: today, dateTo: today, bucket: 'DAY', page: 1 }
  })
  const summary = useRef<HTMLElement>(null)
  const focusReport = useRef(false)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const report = useAttendanceReport(shopId, filter)
  useEffect(() => {
    if (focusReport.current && !report.isFetching && report.data) {
      focusReport.current = false
      summary.current?.scrollIntoView?.({ behavior: 'instant', block: 'start' })
    }
  }, [report.data, report.isFetching])
  const formatTime = (value: string) => new Intl.DateTimeFormat('th-TH', {
    timeZone: report.data?.timezone ?? attendanceTimeZone, dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(value))
  return <main className="attendance-workspace mx-auto grid w-full min-w-0 max-w-3xl gap-5 p-4 sm:p-6">
    <header className="flex items-start gap-3">
      <span className="attendance-icon attendance-title-icon"><Icon name="clock" size={24} /></span>
      <div className="min-w-0"><h1 className="text-2xl font-bold">ลงเวลาเข้า–ออกงาน</h1><p className="mt-1 text-sm text-muted">บันทึกเวลาทำงานของคุณ</p></div>
    </header>
    <AttendanceClockCard shopId={shopId} shopName={shopName} />
    <PersonalAttendanceSummary shopId={shopId} />
    <h2 className="text-lg font-bold">{owner ? 'รายงานเวลาทำงานของพนักงาน' : 'รายงานเวลาทำงานของฉัน'}</h2>
    <form className="grid min-w-0 grid-cols-1 gap-3 border border-line bg-white p-4 sm:grid-cols-3" onSubmit={(event) => {
      event.preventDefault()
      const values = new FormData(event.currentTarget)
      const next = { dateFrom: String(values.get('dateFrom') ?? ''), dateTo: String(values.get('dateTo') ?? ''), bucket: String(values.get('bucket') ?? 'DAY') as HoursBucket, page: 1 }
      const error = validateDateRange(next.dateFrom, next.dateTo)
      setRangeError(error)
      if (!error) {
        focusReport.current = true
        setFilter(next)
        if (JSON.stringify(next) === JSON.stringify(filter)) { void report.refetch() }
      }
    }}>
      <label className="grid min-w-0 gap-1 text-sm">ตั้งแต่วันที่<input type="date" name="dateFrom" required className={field} defaultValue={filter.dateFrom} /></label>
      <label className="grid min-w-0 gap-1 text-sm">ถึงวันที่<input type="date" name="dateTo" required className={field} defaultValue={filter.dateTo} /></label>
      <label className="grid min-w-0 gap-1 text-sm">สรุปตาม<select name="bucket" className={field} defaultValue={filter.bucket}><option value="DAY">วัน</option><option value="WEEK">สัปดาห์</option><option value="MONTH">เดือน</option></select></label>
      <button className="min-h-12 bg-brand-action px-4 font-bold text-white sm:col-span-3">ดูรายงาน</button>
      {rangeError && <p role="alert" className="text-sm text-red-700 sm:col-span-3">{rangeError}</p>}
    </form>
    {report.isPending && <LoadingState label="กำลังคำนวณเวลาทำงาน…" />}
    {report.error && <p role="alert" className="text-red-700">{attendanceError(report.error)}</p>}
    {report.data && <section ref={summary} aria-label="สรุปชั่วโมงงาน" className="grid min-w-0 scroll-mt-24 gap-4">
      <h2 className="text-lg font-bold">สรุปชั่วโมงงาน · {filter.bucket === 'DAY' ? 'รายวัน' : filter.bucket === 'WEEK' ? 'รายสัปดาห์' : 'รายเดือน'}</h2>
      <div className="border border-line bg-white p-4"><p className="text-sm text-muted">{filter.dateFrom} – {filter.dateTo} · {report.data.timezone}</p><p className="mt-2 text-2xl font-bold">{hoursText(report.data.totalSeconds)}</p><p className="mt-1 text-sm text-muted">{report.data.totalShifts} รอบงาน · ยังไม่ออกงาน {report.data.activeShifts} รอบ{report.isFetching ? ' · กำลังอัปเดต…' : ''}</p><p className="mt-2 text-xs text-muted">แบ่งวันเวลาเที่ยงคืน · สัปดาห์จันทร์–อาทิตย์ · รวมเฉพาะช่วงวันที่เลือก</p></div>
      {report.data.rows.length === 0 && <p className="border border-dashed border-line p-6 text-center text-muted">ยังไม่มีรายการลงเวลาในช่วงนี้</p>}
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">{report.data.rows.map((row) => <article key={`${row.period}-${row.userId}`} className="min-w-0 border border-line bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 break-words font-bold">{row.employeeName}</h2><strong className="text-brand-action">{hoursText(row.seconds)}</strong></div><p className="mt-2 text-sm">{filter.bucket === 'WEEK' ? 'สัปดาห์เริ่ม ' : filter.bucket === 'MONTH' ? 'เดือน ' : ''}{filter.bucket === 'MONTH' ? row.period.slice(0, 7) : row.period} · {row.shifts} รอบ</p><p className="mt-2 text-xs text-muted">เริ่ม {formatTime(row.firstIn)}<br />ถึง {formatTime(row.lastOut)}</p>{row.isLive && <p className="mt-2 text-xs font-semibold text-amber-800">มีรอบงานที่ยังไม่ออก · ยอดชั่วคราว</p>}</article>)}</div>
      <div className="flex items-center justify-between gap-2"><button type="button" className="border border-line bg-white px-3 disabled:opacity-40" disabled={filter.page <= 1 || report.isFetching} onClick={() => setFilter({ ...filter, page: filter.page - 1 })}>ก่อนหน้า</button><span className="text-sm">หน้า {filter.page} / {Math.max(1, Math.ceil(report.data.totalCount / report.data.pageSize))}</span><button type="button" className="border border-line bg-white px-3 disabled:opacity-40" disabled={filter.page * report.data.pageSize >= report.data.totalCount || report.isFetching} onClick={() => setFilter({ ...filter, page: filter.page + 1 })}>ถัดไป</button></div>
    </section>}
  </main>
}
