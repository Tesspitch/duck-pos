import { afterEach, describe, expect, it, vi } from 'vitest'

import { browserShopLocationCaptureService } from './browser-shop-location-capture-service'

const originalGeolocation = navigator.geolocation

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation })
})

describe('browser shop location capture service', () => {
  it('returns coordinates and accuracy from the browser', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({
      coords: { latitude: 13.756331, longitude: 100.501762, accuracy: 8 },
    } as GeolocationPosition))
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })

    await expect(browserShopLocationCaptureService.capture()).resolves.toEqual({
      latitude: 13.756331,
      longitude: 100.501762,
      accuracyM: 8,
    })
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    })
  })

  it('explains when location permission is denied', async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, failure: PositionErrorCallback) => failure({
      code: 1,
    } as GeolocationPositionError))
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })

    await expect(browserShopLocationCaptureService.capture()).rejects.toThrow('อนุญาต Location')
  })
})
