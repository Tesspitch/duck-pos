import { supabase } from '../../../lib/supabase'
import type { AttendanceRepository } from '../application/attendance-context'
import { attendanceDate, timeEntrySeconds } from '../domain/attendance'

const timeEntryColumns = 'id, clockedInAt:clocked_in_at, clockedOutAt:clocked_out_at'

export const supabaseAttendanceRepository: AttendanceRepository = {
  async getMine() {
    const { data, error } = await supabase.rpc('get_my_attendance')
    if (error) throw error
    return data
  },
  async getPersonal(shopId, userId, now) {
    const start = new Date(`${attendanceDate.format(now)}T00:00:00+07:00`)
    const entries = () => supabase.from('staff_time_entries').select(timeEntryColumns)
      .eq('shop_id', shopId).eq('user_id', userId)
    const [today, recent] = await Promise.all([
      entries().or(`clocked_out_at.is.null,clocked_out_at.gt.${start.toISOString()}`),
      entries().order('clocked_in_at', { ascending: false }).order('id').limit(3),
    ])
    if (today.error) throw today.error
    if (recent.error) throw recent.error
    return {
      todaySeconds: today.data.reduce((seconds, entry) => seconds + timeEntrySeconds(entry, now.getTime(), start.getTime()), 0),
      recent: recent.data,
    }
  },
  async clockIn(shopId, position) {
    const { error } = await supabase.rpc('clock_in_staff', {
      target_shop_id: shopId, staff_latitude: position.latitude, staff_longitude: position.longitude,
      staff_accuracy_m: position.accuracyM, location_captured_at: position.capturedAt,
    })
    if (error) throw error
  },
  async clockOut(entryId) {
    const { error } = await supabase.rpc('clock_out_staff', { expected_entry_id: entryId })
    if (error) throw error
  },
  async getReport(shopId, filter) {
    const { data, error } = await supabase.rpc('get_staff_hours_report', {
      target_shop_id: shopId, date_from: filter.dateFrom, date_to: filter.dateTo,
      bucket_unit: filter.bucket, page_number: filter.page, page_size: 50,
    })
    if (error) throw error
    return data
  },
}
