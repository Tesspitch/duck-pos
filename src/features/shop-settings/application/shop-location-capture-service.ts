export interface CapturedShopLocation {
  latitude: number
  longitude: number
  accuracyM: number
}

export interface ShopLocationCaptureService {
  capture(): Promise<CapturedShopLocation>
}
