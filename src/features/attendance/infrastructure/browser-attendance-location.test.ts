import { afterEach, expect, test, vi } from 'vitest'
import { browserAttendanceLocation } from './browser-attendance-location'
afterEach(() => vi.unstubAllGlobals())
test('requests a fresh high-accuracy reading and preserves the GPS timestamp', async () => {
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success) => success({ coords: { latitude: 16, longitude: 103, accuracy: 8 }, timestamp: 1_700_000_000_000 } as GeolocationPosition))
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  expect(await browserAttendanceLocation.capture()).toEqual({ latitude: 16, longitude: 103, accuracyM: 8, capturedAt: new Date(1_700_000_000_000).toISOString() })
  expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual({ enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 })
})
test.each([
  [1, 'กรุณาอนุญาตเข้าถึงตำแหน่งเพื่อเข้างาน'],
  [2, 'ไม่พบตำแหน่ง'],
  [3, 'ค้นหาตำแหน่งนานเกินไป'],
])('explains geolocation failure code %s', async (code, message) => {
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_success: unknown, reject: (error: { code: number }) => void) => reject({ code }) } })
  await expect(browserAttendanceLocation.capture()).rejects.toThrow(String(message))
})
test('unsupported devices receive an actionable error', async () => {
  vi.stubGlobal('navigator', {})
  await expect(browserAttendanceLocation.capture()).rejects.toThrow('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง')
})
