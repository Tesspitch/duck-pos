import type { ShopOnboardingRepository } from '../application/shop-onboarding-repository'
import type { ShopCreationAccess } from '../domain/shop-creation-access'
import { supabase } from '../../../lib/supabase'

export const supabaseShopOnboardingRepository: ShopOnboardingRepository = {
  async getAccessForUser(userId) {
    const { data, error } = await supabase
      .from('shop_creation_grants')
      .select('id, status, created_shop_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data as ShopCreationAccess | null
  },

  async createShop({ name, timezone, currencyCode }) {
    const { data, error } = await supabase.rpc('create_shop_from_grant', {
      shop_name: name,
      shop_timezone: timezone,
      shop_currency_code: currencyCode,
    })

    if (error) throw error
    return data as string
  },
}

