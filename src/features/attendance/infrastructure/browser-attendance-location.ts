import type { AttendanceLocationService } from '../application/attendance-context'
const errors: Record<number, string> = {
  1: 'กรุณาอนุญาตเข้าถึงตำแหน่งเพื่อเข้างาน',
  2: 'ไม่พบตำแหน่ง กรุณาย้ายไปจุดที่รับสัญญาณ GPS ได้ดี',
  3: 'ค้นหาตำแหน่งนานเกินไป กรุณาลองใหม่',
}
export const browserAttendanceLocation: AttendanceLocationService = {
  capture() {
    if (!navigator.geolocation) return Promise.reject(new Error('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'))
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracyM: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString(),
      }),
      (error) => reject(new Error(errors[error.code] ?? errors[2])),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    ))
  },
}
