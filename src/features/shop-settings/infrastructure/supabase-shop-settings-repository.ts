import { supabase } from '../../../lib/supabase'
import type { ShopSettingsRepository } from '../application/shop-settings-repository'
import type { ShopBranding } from '../domain/shop-branding'

interface ShopRow {
  id: string
  name: string
  timezone: string
  currency_code: string
  logo_path: string | null
}

function mapShop(row: ShopRow): ShopBranding {
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    currencyCode: row.currency_code,
    logoPath: row.logo_path,
    logoUrl: row.logo_path
      ? supabase.storage.from('shop-assets').getPublicUrl(row.logo_path).data.publicUrl
      : null,
  }
}

export const supabaseShopSettingsRepository: ShopSettingsRepository = {
  async get(shopId) {
    const { data, error } = await supabase
      .from('shops')
      .select('id, name, timezone, currency_code, logo_path')
      .eq('id', shopId)
      .single()
    if (error) throw error
    return mapShop(data as ShopRow)
  },

  async save(input) {
    const { data, error } = await supabase.rpc('update_shop_branding', {
      target_shop_id: input.shopId,
      shop_name: input.name,
      shop_logo_path: input.logoPath,
    })
    if (error) throw error
    return mapShop(data as ShopRow)
  },
}
