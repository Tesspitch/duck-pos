import { describe, expect, it } from 'vitest'

import { cartLineTotal, useCartStore } from './cart-store'

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

it('keeps quantities finite, whole and within checkout limits', () => {
  const line = { key: 'quantity', productId: 'p', productName: 'Kebab', basePriceSatang: 3900, quantity: 2, note: '', options: [] }
  useCartStore.setState({ lines: [line] })
  for (const invalid of [NaN, Infinity, -Infinity]) {
    useCartStore.getState().changeQuantity(line.key, invalid)
    expect(useCartStore.getState().lines[0]?.quantity).toBe(2)
  }
  for (const [input, expected] of [[2.5, 2], [99, 20], [0, 1], [-1, 1]] as const) {
    useCartStore.getState().changeQuantity(line.key, input)
    expect(useCartStore.getState().lines[0]?.quantity).toBe(expected)
  }
  useCartStore.getState().clear()
})

it('restores notes and reuses the accepted-request identity after rehydration',async()=>{
  const cart=useCartStore.getState()
  cart.ensureShop('update-test')
  cart.addLine({key:'persistent',productId:'p',productName:'Kebab',basePriceSatang:3900,quantity:2,note:'เผ็ดน้อย',options:[]})
  cart.setOrderNote('แยกซอส')
  const identity=cart.checkoutIdentity('unchanged-cart')
  const saved=sessionStorage.getItem('duckpos-customer-cart')!
  useCartStore.setState({lines:[],orderNote:'',request:null})
  sessionStorage.setItem('duckpos-customer-cart',saved)
  await useCartStore.persist.rehydrate()
  expect(useCartStore.getState().orderNote).toBe('แยกซอส')
  expect(useCartStore.getState().lines[0]).toMatchObject({quantity:2,note:'เผ็ดน้อย'})
  expect(useCartStore.getState().checkoutIdentity('unchanged-cart')).toEqual(identity)
  useCartStore.getState().clear()
})
