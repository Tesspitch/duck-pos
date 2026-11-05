import { supabase } from '../../../lib/supabase'
import type { AttendanceRepository } from '../application/attendance-context'
export const supabaseAttendanceRepository: AttendanceRepository = {
  async getMine() {
    const { data, error } = await supabase.rpc('get_my_attendance')
    if (error) throw error
    return data
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
