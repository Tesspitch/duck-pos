export function buildShopMenuUrl(origin: string, shopId: string) {
  const normalizedOrigin = origin.replace(/\/$/, '')
  return `${normalizedOrigin}/order/${encodeURIComponent(shopId)}`
}

export function qrDownloadName(shopName: string, extension: 'png' | 'svg') {
  const safeName = shopName.trim().replace(/[^\p{L}\p{M}\p{N}-]+/gu, '-').replace(/^-+|-+$/g, '') || 'shop'
  return `duckpos-${safeName}-qr.${extension}`
}
