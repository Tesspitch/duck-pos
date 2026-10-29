import { describe, expect, it } from 'vitest'

import { buildShopMenuUrl, qrDownloadName } from './shop-menu-link'

describe('shop menu QR link', () => {
  it('builds a public order URL without a duplicate slash', () => {
    expect(buildShopMenuUrl('https://duckpos.example/', 'shop-id')).toBe('https://duckpos.example/order/shop-id')
  })

  it('creates a filesystem-safe Thai download name', () => {
    expect(qrDownloadName('ร้าน เป็ด / สาขา 1', 'png')).toBe('duckpos-ร้าน-เป็ด-สาขา-1-qr.png')
  })
})
