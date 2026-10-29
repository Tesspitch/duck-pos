import { describe, expect, it } from 'vitest'

import { cartLineTotal } from './cart-store'

describe('cartLineTotal', () => {
  it('calculates option deltas and quantity in satang', () => {
    expect(cartLineTotal({
      key: 'line-1',
      productId: 'product-1',
      productName: 'Kebab',
      basePriceSatang: 6000,
      quantity: 2,
      note: '',
      options: [
        { id: 'option-1', name: 'Cheese', priceDeltaSatang: 1000 },
        { id: 'option-2', name: 'Large', priceDeltaSatang: 1500 },
      ],
    })).toBe(17_000)
  })
})
