import { supabase } from '../../../lib/supabase'
import type { ShopLogoService } from '../application/shop-logo-service'
import { optimizeShopLogo } from './browser-logo-optimizer'

export const supabaseShopLogoService: ShopLogoService = {
  async upload(shopId, file) {
    const optimized = await optimizeShopLogo(file)
    const path = `${shopId}/logo/${crypto.randomUUID()}.webp`
    const { error } = await supabase.storage.from('shop-assets').upload(path, optimized, {
      cacheControl: '31536000',
      contentType: 'image/webp',
      upsert: false,
    })
    if (error) throw error
    return path
  },

  async remove(path) {
    const { error } = await supabase.storage.from('shop-assets').remove([path])
    if (error) throw error
  },
}
