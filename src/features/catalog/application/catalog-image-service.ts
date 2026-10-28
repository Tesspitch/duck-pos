export interface CatalogImageService {
  upload(input: { shopId: string; productId: string; file: File }): Promise<string>
  remove(path: string): Promise<void>
}
