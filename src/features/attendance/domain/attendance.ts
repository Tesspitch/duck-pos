export type HoursBucket = 'DAY' | 'WEEK' | 'MONTH'
export interface AttendancePosition { latitude: number; longitude: number; accuracyM: number; capturedAt: string }
export interface ActiveTimeEntry { id: string; shopId: string; shopName: string; clockedInAt: string }
export interface AttendanceState { activeEntry: ActiveTimeEntry | null; serverTime: string }
export interface HoursFilter { dateFrom: string; dateTo: string; bucket: HoursBucket; page: number }
export interface HoursReport {
  timezone: string; serverTime: string; totalSeconds: number; totalShifts: number; activeShifts: number
  totalCount: number; page: number; pageSize: number
  rows: Array<{ period: string; userId: string; employeeName: string; seconds: number; shifts: number; isLive: boolean; firstIn: string; lastOut: string }>
}
export function hoursText(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60)
  return `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`
}
export function attendanceError(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
  const messages: Record<string, string> = {
    'Location coordinates are missing or invalid.': 'พิกัดไม่ถูกต้อง กรุณาลองระบุตำแหน่งอีกครั้ง',
    'Location accuracy must be within 100 meters.': 'ตำแหน่งยังไม่แม่นยำ กรุณาย้ายไปจุดที่รับสัญญาณ GPS ได้ดีแล้วลองใหม่',
    'Location reading is stale or invalid.': 'ข้อมูลตำแหน่งหมดอายุ กรุณากดยืนยันเข้างานอีกครั้ง',
    'Shop location is not configured.': 'ร้านยังไม่ตั้งค่าพิกัด กรุณาให้เจ้าของร้านตั้งค่าตำแหน่งร้านก่อน',
    'Staff is outside the clock-in area.': 'คุณอยู่นอกรัศมี 100 เมตรของร้าน กรุณาเข้างานเมื่ออยู่ใกล้ร้าน',
    'กรุณาอนุญาตเข้าถึงตำแหน่งเพื่อเข้างาน': 'กรุณาอนุญาตเข้าถึงตำแหน่งเพื่อเข้างาน',
    'ไม่พบตำแหน่ง กรุณาย้ายไปจุดที่รับสัญญาณ GPS ได้ดี': 'ไม่พบตำแหน่ง กรุณาย้ายไปจุดที่รับสัญญาณ GPS ได้ดี',
    'ค้นหาตำแหน่งนานเกินไป กรุณาลองใหม่': 'ค้นหาตำแหน่งนานเกินไป กรุณาลองใหม่',
    'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง': 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง',
    'Already clocked in. Clock out before starting another shift.': 'ลงเวลาเข้างานอยู่แล้ว กรุณาออกงานก่อนเริ่มรอบใหม่',
    'Active shop membership is required.': 'ไม่มีสิทธิ์ลงเวลาหรือดูรายงานของร้านนี้',
    'Time entry not found.': 'ไม่พบรายการลงเวลา กรุณาโหลดข้อมูลอีกครั้ง',
    'Shop is unavailable.': 'ร้านนี้ไม่พร้อมใช้งาน',
  }
  return messages[message] ?? 'ทำรายการไม่สำเร็จ กรุณาลองใหม่'
}
