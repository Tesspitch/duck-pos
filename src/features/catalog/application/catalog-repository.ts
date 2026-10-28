import type {
  Category,
  SaveCategoryInput,
  SaveOptionGroupInput,
  SaveProductInput,
  SaveProductOptionInput,
} from '../domain/catalog'

export interface CatalogRepository {
  list(shopId: string): Promise<Category[]>
  saveCategory(input: SaveCategoryInput): Promise<string>
  deleteCategory(shopId: string, categoryId: string): Promise<void>
  saveProduct(input: SaveProductInput): Promise<string>
  setProductImage(shopId: string, productId: string, imagePath: string | null): Promise<void>
  deleteProduct(shopId: string, productId: string): Promise<void>
  setProductAvailability(shopId: string, productId: string, available: boolean): Promise<void>
  saveOptionGroup(input: SaveOptionGroupInput): Promise<string>
  deleteOptionGroup(shopId: string, optionGroupId: string): Promise<void>
  saveProductOption(input: SaveProductOptionInput): Promise<string>
  deleteProductOption(shopId: string, productOptionId: string): Promise<void>
  setProductOptionAvailability(
    shopId: string,
    productOptionId: string,
    available: boolean,
  ): Promise<void>
}
