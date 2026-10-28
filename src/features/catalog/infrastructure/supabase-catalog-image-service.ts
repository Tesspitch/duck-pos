import { supabase } from '../../../lib/supabase'
import type { CatalogImageService } from '../application/catalog-image-service'
import { optimizeProductImage } from './browser-image-optimizer'

export const supabaseCatalogImageService: CatalogImageService = {
  async upload({ shopId, productId, file }) {
    const optimized = await optimizeProductImage(file)
    const path = `${shopId}/${productId}/${crypto.randomUUID()}.webp`
    const { error } = await supabase.storage.from('product-images').upload(path, optimized, {
      cacheControl: '31536000',
      contentType: 'image/webp',
      upsert: false,
    })
    if (error) throw error
    return path
  },

  async remove(path) {
    const { error } = await supabase.storage.from('product-images').remove([path])
    if (error) throw error
  },
}
