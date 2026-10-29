export interface PublicMenuOption {
  id: string
  name: string
  priceDeltaSatang: number
  isAvailable: boolean
}

export interface PublicMenuOptionGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  options: PublicMenuOption[]
}

export interface PublicMenuProduct {
  id: string
  name: string
  description: string
  basePriceSatang: number
  imagePath: string | null
  imageUrl: string | null
  isAvailable: boolean
  optionGroups: PublicMenuOptionGroup[]
}

export interface PublicMenuCategory {
  id: string
  name: string
  products: PublicMenuProduct[]
}

export interface PublicMenu {
  shopId: string
  shopName: string
  logoPath: string | null
  logoUrl: string | null
  currencyCode: string
  isOpen: boolean
  categories: PublicMenuCategory[]
}
