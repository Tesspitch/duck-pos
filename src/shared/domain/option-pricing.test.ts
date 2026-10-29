import { describe, expect, it } from 'vitest'

import { priceSelectedOptions } from './option-pricing'

const options = [
  { id: 'a', name: 'A', priceDeltaSatang: 500 },
  { id: 'b', name: 'B', priceDeltaSatang: 700 },
  { id: 'c', name: 'C', priceDeltaSatang: 900 },
]

describe('priceSelectedOptions', () => {
  it('keeps individual topping prices in per-topping mode', () => {
    const result = priceSelectedOptions([{ id: 'g', pricingMode: 'PER_TOPPING', additionalSelectionPriceSatang: 0, options }], { g: ['a', 'c'] })
    expect(result.map((option) => option.priceDeltaSatang)).toEqual([500, 900])
  })

  it('makes the first catalog-ordered selection free and prices the rest at the group rate', () => {
    const result = priceSelectedOptions([{ id: 'g', pricingMode: 'FIRST_FREE_THEN_FIXED', additionalSelectionPriceSatang: 1000, options }], { g: ['c', 'a', 'b'] })
    expect(result.map((option) => [option.id, option.priceDeltaSatang])).toEqual([['a', 0], ['b', 1000], ['c', 1000]])
  })
})
