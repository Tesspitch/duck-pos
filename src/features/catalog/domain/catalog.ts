export interface ProductOption {
  id: string
  shopId: string
  optionGroupId: string
  name: string
  priceDeltaSatang: number
  sortOrder: number
  isVisible: boolean
  isAvailable: boolean
}
export interface OptionGroup {
  id: string
  shopId: string
  productId: string
  name: string
  minSelect: number
  maxSelect: number
  selectionMode: OptionSelectionMode
  isRequired: boolean
  pricingMode: OptionPricingMode
  additionalSelectionPriceSatang: number
  sortOrder: number
  isVisible: boolean
  options: ProductOption[]
}

export interface Product {
  id: string
  shopId: string
  categoryId: string
  name: string
  description: string
  basePriceSatang: number
  imagePath: string | null
  imageUrl: string | null
  sortOrder: number
  isVisible: boolean
  isAvailable: boolean
  optionGroups: OptionGroup[]
}

export interface Category {
  id: string
  shopId: string
  name: string
  sortOrder: number
  isVisible: boolean
  products: Product[]
}

export interface SaveCategoryInput {
  shopId: string
  id?: string
  name: string
  sortOrder: number
  isVisible: boolean
}

export interface SaveProductInput {
  shopId: string
  id?: string
  categoryId: string
  name: string
  description: string
  basePriceSatang: number
  imagePath: string | null
  sortOrder: number
  isVisible: boolean
  isAvailable: boolean
}
import type { OptionPricingMode, OptionSelectionMode } from '../../../shared/domain/option-pricing'

