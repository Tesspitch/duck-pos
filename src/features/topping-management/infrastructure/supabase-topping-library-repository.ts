import { supabase } from '../../../lib/supabase'
import type { ToppingLibraryRepository } from '../application/topping-library-repository'
import type { ToppingLibrary } from '../domain/topping-library'

export const supabaseToppingLibraryRepository: ToppingLibraryRepository = {
  async get(shopId) {
    const { data, error } = await supabase.rpc('get_topping_library', { target_shop_id: shopId })
    if (error) throw error
    return data as unknown as ToppingLibrary
  },

  async saveGroup(input) {
    const { data, error } = await supabase.rpc('save_topping_group', {
      target_shop_id: input.shopId,
      target_topping_group_id: input.id ?? null,
      topping_group_name: input.name,
      topping_group_selection_mode: input.selectionMode,
      topping_group_is_required: input.isRequired,
      topping_group_pricing_mode: input.pricingMode,
      topping_group_additional_price_satang: input.additionalSelectionPriceSatang,
      topping_group_is_visible: input.isVisible,
      selected_category_ids: input.categoryIds,
    })
    if (error) throw error
    return data as string
  },

  async deleteGroup(shopId, groupId) {
    const { error } = await supabase.rpc('delete_topping_group', {
      target_shop_id: shopId,
      target_topping_group_id: groupId,
    })
    if (error) throw error
  },

  async saveTopping(input) {
    const { data, error } = await supabase.rpc('save_topping', {
      target_shop_id: input.shopId,
      target_topping_id: input.id ?? null,
      target_topping_group_id: input.groupId,
      topping_name: input.name,
      topping_price_delta_satang: input.priceDeltaSatang,
      topping_is_visible: input.isVisible,
      topping_is_available: input.isAvailable,
    })
    if (error) throw error
    return data as string
  },

  async deleteTopping(shopId, toppingId) {
    const { error } = await supabase.rpc('delete_topping', {
      target_shop_id: shopId,
      target_topping_id: toppingId,
    })
    if (error) throw error
  },

  async setToppingAvailability(shopId, toppingId, available) {
    const { error } = await supabase.rpc('set_topping_availability', {
      target_shop_id: shopId,
      target_topping_id: toppingId,
      topping_is_available: available,
    })
    if (error) throw error
  },
}
