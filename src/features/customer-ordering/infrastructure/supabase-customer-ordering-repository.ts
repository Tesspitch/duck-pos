import { supabase } from '../../../lib/supabase'
import type { CustomerOrderingRepository } from '../application/customer-ordering-repository'
import type { PublicMenu } from '../domain/public-menu'

function addPublicUrls(menu: Omit<PublicMenu, 'logoUrl'>): PublicMenu {
  return {
    ...menu,
    logoUrl: menu.logoPath
      ? supabase.storage.from('shop-assets').getPublicUrl(menu.logoPath).data.publicUrl
      : null,
    categories: menu.categories.map((category) => ({
      ...category,
      products: category.products.map((product) => ({
        ...product,
        imageUrl: product.imagePath
          ? supabase.storage.from('product-images').getPublicUrl(product.imagePath).data.publicUrl
          : null,
      })),
    })),
  }
}

export const supabaseCustomerOrderingRepository: CustomerOrderingRepository = {
  async getMenu(shopId) {
    const { data, error } = await supabase.rpc('get_public_menu', { target_shop_id: shopId })
    if (error) throw error
    return data ? addPublicUrls(data as Omit<PublicMenu, 'logoUrl'>) : null
  },

  async checkout(input) {
    const { data, error } = await supabase.functions.invoke('customer-checkout', {
      body: {
        shopId: input.shopId,
        idempotencyKey: input.idempotencyKey,
        trackingToken: input.trackingToken,
        location: input.location,
        cartItems: input.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          note: line.note,
          optionIds: line.options.map((option) => option.id),
        })),
        orderNote: input.note,
      },
    })
    if (error) {
      const context = 'context' in error ? error.context : null
      if (context instanceof Response) {
        const payload = await context.clone().json().catch(() => null)
        if (payload?.error) throw new Error(payload.error)
      }
      throw error
    }
    return data
  },

  async track(trackingToken) {
    const { data, error } = await supabase.rpc('track_order', { request_tracking_token: trackingToken })
    if (error) throw error
    return data
  },
}
