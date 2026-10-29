import { describe, expect, it } from 'vitest'

import type { PosCartLine } from './pos-cart'
import { posCartLineTotal, posCartTotal } from './pos-cart'

const line: PosCartLine = {
  key: 'line-1',
  productId: 'product-1',
  productName: 'เคบับ',
  basePriceSatang: 10_000,
  quantity: 2,
  note: '',
  options: [{ id: 'option-1', name: 'ชีส', priceDeltaSatang: 2_000 }],
}

describe('POS cart totals', () => {
  it('includes option price and quantity', () => {
    expect(posCartLineTotal(line)).toBe(24_000)
  })

  it('adds every line', () => {
    expect(posCartTotal([line, { ...line, key: 'line-2', quantity: 1 }])).toBe(36_000)
  })
})

