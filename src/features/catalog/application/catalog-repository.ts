import type {
  Category,
  SaveCategoryInput,
  SaveProductInput,
} from '../domain/catalog'

export interface CatalogRepository {
  list(shopId: string): Promise<Category[]>
  saveCategory(input: SaveCategoryInput): Promise<string>
  deleteCategory(shopId: string, categoryId: string): Promise<void>
  saveProduct(input: SaveProductInput): Promise<string>
  setProductImage(shopId: string, productId: string, imagePath: string | null): Promise<void>
  deleteProduct(shopId: string, productId: string): Promise<void>
  setProductAvailability(shopId: string, productId: string, available: boolean): Promise<void>
}
