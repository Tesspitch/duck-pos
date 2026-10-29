import type { CustomerLocationService } from '../application/customer-location-service'

export const browserCustomerLocationService: CustomerLocationService = {
  capture() {
    if (!navigator.geolocation) return Promise.reject(new Error('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'))
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
        }),
        () => reject(new Error('ไม่สามารถอ่านตำแหน่งได้ กรุณาอนุญาต Location หรือติดต่อพนักงาน')),
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
      )
    })
  },
}
