export interface ShopLogoService {
  upload(shopId: string, file: File): Promise<string>
  remove(path: string): Promise<void>
}
