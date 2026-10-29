import type { ShopLocationCaptureService } from '../application/shop-location-capture-service'

const locationErrors: Record<number, string> = {
  1: 'ไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง กรุณาอนุญาต Location ใน Browser',
  2: 'ไม่พบตำแหน่งปัจจุบัน กรุณาออกไปยังจุดที่รับสัญญาณ GPS ได้ดีขึ้น',
  3: 'ค้นหาตำแหน่งนานเกินไป กรุณาลองอีกครั้ง',
}

export const browserShopLocationCaptureService: ShopLocationCaptureService = {
  capture() {
    if (!navigator.geolocation) return Promise.reject(new Error('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'))
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        }),
        (error) => reject(new Error(locationErrors[error.code] ?? 'ไม่สามารถอ่านตำแหน่งปัจจุบันได้')),
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      )
    })
  },
}
