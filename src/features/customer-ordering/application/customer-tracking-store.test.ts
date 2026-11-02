import { afterEach, expect, test } from 'vitest'
import { useCustomerTrackingStore } from './customer-tracking-store'

afterEach(() => useCustomerTrackingStore.setState({ tokensByShop: {}, historyByShop: {} }))

test('new checkout preserves earlier orders from the same shop without duplicates', () => {
  const { remember } = useCustomerTrackingStore.getState()
  remember('a', 'first')
  remember('a', 'second')
  remember('a', 'second')
  remember('b', 'other')
  expect(useCustomerTrackingStore.getState().historyByShop).toEqual({ a: ['second', 'first'], b: ['other'] })
  expect(useCustomerTrackingStore.getState().tokensByShop.a).toBe('second')
  remember('a', 'first')
  expect(useCustomerTrackingStore.getState().historyByShop.a).toEqual(['second', 'first'])
})

test('legacy single-token storage is retained when another order is placed and survives rehydration', async () => {
  useCustomerTrackingStore.setState({ tokensByShop: { a: 'legacy' }, historyByShop: {} })
  useCustomerTrackingStore.getState().remember('a', 'new')
  await useCustomerTrackingStore.persist.rehydrate()
  expect(useCustomerTrackingStore.getState().historyByShop.a).toEqual(['new', 'legacy'])
})
