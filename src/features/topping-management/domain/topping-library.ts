import type { OptionPricingMode, OptionSelectionMode } from '../../../shared/domain/option-pricing'

export interface ToppingMenuCategory {
  id: string
  name: string
}

export interface Topping {
  id: string
  groupId: string
  name: string
  priceDeltaSatang: number
  sortOrder: number
  isVisible: boolean
  isAvailable: boolean
}

export interface ToppingGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  sortOrder: number
  isVisible: boolean
  selectionMode: OptionSelectionMode
  isRequired: boolean
  pricingMode: OptionPricingMode
  additionalSelectionPriceSatang: number
  categoryIds: string[]
  toppings: Topping[]
}

export interface ToppingLibrary {
  categories: ToppingMenuCategory[]
  groups: ToppingGroup[]
}

export interface SaveToppingGroupInput {
  shopId: string
  id?: string
  name: string
  selectionMode: OptionSelectionMode
  isRequired: boolean
  pricingMode: OptionPricingMode
  additionalSelectionPriceSatang: number
  isVisible: boolean
  categoryIds: string[]
}

export interface SaveToppingInput {
  shopId: string
  groupId: string
  id?: string
  name: string
  priceDeltaSatang: number
  isVisible: boolean
  isAvailable: boolean
}

