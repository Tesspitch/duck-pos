import { supabase } from '../../../lib/supabase'
import type { CatalogRepository } from '../application/catalog-repository'
import type { Category, OptionGroup, Product, ProductOption } from '../domain/catalog'

interface CatalogRow {
  id: string
  shop_id: string
  name: string
  sort_order: number
  is_visible: boolean
  products: ProductRow[] | null
}

interface ProductRow {
  id: string
  shop_id: string
  category_id: string
  name: string
  description: string
  base_price_satang: number
  image_path: string | null
  sort_order: number
  is_visible: boolean
  is_available: boolean
  option_groups: OptionGroupRow[] | null
}

interface OptionGroupRow {
  id: string
  shop_id: string
  product_id: string
  name: string
  min_select: number
  max_select: number
  sort_order: number
  is_visible: boolean
  product_options: ProductOptionRow[] | null
}

interface ProductOptionRow {
  id: string
  shop_id: string
  option_group_id: string
  name: string
  price_delta_satang: number
  sort_order: number
  is_visible: boolean
  is_available: boolean
}

const bySortOrderAndName = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'th')

function publicImageUrl(path: string | null) {
  if (!path) return null
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

function mapOption(row: ProductOptionRow): ProductOption {
  return {
    id: row.id,
    shopId: row.shop_id,
    optionGroupId: row.option_group_id,
    name: row.name,
    priceDeltaSatang: row.price_delta_satang,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    isAvailable: row.is_available,
  }
}

function mapOptionGroup(row: OptionGroupRow): OptionGroup {
  return {
    id: row.id,
    shopId: row.shop_id,
    productId: row.product_id,
    name: row.name,
    minSelect: row.min_select,
    maxSelect: row.max_select,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    options: (row.product_options ?? []).map(mapOption).sort(bySortOrderAndName),
  }
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    shopId: row.shop_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    basePriceSatang: row.base_price_satang,
    imagePath: row.image_path,
    imageUrl: publicImageUrl(row.image_path),
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    isAvailable: row.is_available,
    optionGroups: (row.option_groups ?? []).map(mapOptionGroup).sort(bySortOrderAndName),
  }
}

function mapCategory(row: CatalogRow): Category {
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    products: (row.products ?? []).map(mapProduct).sort(bySortOrderAndName),
  }
}

export const supabaseCatalogRepository: CatalogRepository = {
  async list(shopId) {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        id, shop_id, name, sort_order, is_visible,
        products (
          id, shop_id, category_id, name, description, base_price_satang,
          image_path, sort_order, is_visible, is_available,
          option_groups (
            id, shop_id, product_id, name, min_select, max_select,
            sort_order, is_visible,
            product_options (
              id, shop_id, option_group_id, name, price_delta_satang,
              sort_order, is_visible, is_available
            )
          )
        )
      `)
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data as unknown as CatalogRow[]).map(mapCategory).sort(bySortOrderAndName)
  },

  async saveCategory(input) {
    const { data, error } = await supabase.rpc('save_category', {
      target_shop_id: input.shopId,
      target_category_id: input.id ?? null,
      category_name: input.name,
      category_sort_order: input.sortOrder,
      category_is_visible: input.isVisible,
    })
    if (error) throw error
    return data as string
  },

  async deleteCategory(shopId, categoryId) {
    const { error } = await supabase.rpc('delete_category', {
      target_shop_id: shopId,
      target_category_id: categoryId,
    })
    if (error) throw error
  },

  async saveProduct(input) {
    const { data, error } = await supabase.rpc('save_product', {
      target_shop_id: input.shopId,
      target_product_id: input.id ?? null,
      target_category_id: input.categoryId,
      product_name: input.name,
      product_description: input.description,
      product_base_price_satang: input.basePriceSatang,
      product_sort_order: input.sortOrder,
      product_is_visible: input.isVisible,
      product_is_available: input.isAvailable,
      product_image_path: input.imagePath,
    })
    if (error) throw error
    return data as string
  },

  async setProductImage(shopId, productId, imagePath) {
    const { error } = await supabase.rpc('set_product_image', {
      target_shop_id: shopId,
      target_product_id: productId,
      product_image_path: imagePath,
    })
    if (error) throw error
  },

  async deleteProduct(shopId, productId) {
    const { error } = await supabase.rpc('delete_product', {
      target_shop_id: shopId,
      target_product_id: productId,
    })
    if (error) throw error
  },

  async setProductAvailability(shopId, productId, available) {
    const { error } = await supabase.rpc('set_product_availability', {
      target_shop_id: shopId,
      target_product_id: productId,
      product_is_available: available,
    })
    if (error) throw error
  },

  async saveOptionGroup(input) {
    const { data, error } = await supabase.rpc('save_option_group', {
      target_shop_id: input.shopId,
      target_option_group_id: input.id ?? null,
      target_product_id: input.productId,
      option_group_name: input.name,
      option_group_min_select: input.minSelect,
      option_group_max_select: input.maxSelect,
      option_group_sort_order: input.sortOrder,
      option_group_is_visible: input.isVisible,
    })
    if (error) throw error
    return data as string
  },

  async deleteOptionGroup(shopId, optionGroupId) {
    const { error } = await supabase.rpc('delete_option_group', {
      target_shop_id: shopId,
      target_option_group_id: optionGroupId,
    })
    if (error) throw error
  },

  async saveProductOption(input) {
    const { data, error } = await supabase.rpc('save_product_option', {
      target_shop_id: input.shopId,
      target_product_option_id: input.id ?? null,
      target_option_group_id: input.optionGroupId,
      option_name: input.name,
      option_price_delta_satang: input.priceDeltaSatang,
      option_sort_order: input.sortOrder,
      option_is_visible: input.isVisible,
      option_is_available: input.isAvailable,
    })
    if (error) throw error
    return data as string
  },

  async deleteProductOption(shopId, productOptionId) {
    const { error } = await supabase.rpc('delete_product_option', {
      target_shop_id: shopId,
      target_product_option_id: productOptionId,
    })
    if (error) throw error
  },

  async applyOptionGroupToCategory(shopId, optionGroupId) {
    const { data, error } = await supabase.rpc('apply_option_group_to_category', {
      target_shop_id: shopId,
      source_option_group_id: optionGroupId,
    })
    if (error) throw error
    return data
  },

  async setProductOptionAvailability(shopId, productOptionId, available) {
    const { error } = await supabase.rpc('set_product_option_availability', {
      target_shop_id: shopId,
      target_product_option_id: productOptionId,
      option_is_available: available,
    })
    if (error) throw error
  },
}
