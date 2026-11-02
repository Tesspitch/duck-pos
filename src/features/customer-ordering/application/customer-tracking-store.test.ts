import { afterEach, expect, test, vi } from 'vitest'
import { useCustomerTrackingStore } from './customer-tracking-store'
import { legacyTrackingKey, readSavedTracking, saveTrackingOrder } from '../infrastructure/customer-tracking-storage'

afterEach(() => {
  localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks()
  useCustomerTrackingStore.setState({ tokensByShop: {}, historyByShop: {} })
})

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

test('legacy session storage is moved to device storage and survives a new tab', () => {
  sessionStorage.setItem(legacyTrackingKey, JSON.stringify({ state: { tokensByShop: { a: 'legacy' } } }))
  useCustomerTrackingStore.getState().remember('a', 'new')
  sessionStorage.clear()
  useCustomerTrackingStore.setState({ tokensByShop: {}, historyByShop: {} })
  useCustomerTrackingStore.getState().refresh()
  expect(useCustomerTrackingStore.getState().historyByShop.a).toEqual(['new', 'legacy'])
})

test('new tabs preserve each others orders even when their in-memory snapshots are stale', () => {
  useCustomerTrackingStore.getState().remember('a', 'first')
  // Another tab has an independent record and cannot overwrite this order.
  saveTrackingOrder('a', 'second')
  useCustomerTrackingStore.getState().remember('a', 'third')
  expect(new Set(readSavedTracking().historyByShop.a)).toEqual(new Set(['first', 'second', 'third']))
  useCustomerTrackingStore.setState({ tokensByShop: {}, historyByShop: {} })
  useCustomerTrackingStore.getState().refresh()
  expect(useCustomerTrackingStore.getState().historyByShop.a).toHaveLength(3)
})

test('migrates all orders in the previous multi-order session format with shop isolation', () => {
  sessionStorage.setItem(legacyTrackingKey, JSON.stringify({ state: {
    tokensByShop: { a: 'second', b: 'other' }, historyByShop: { a: ['second', 'first'], b: ['other'] },
  } }))
  useCustomerTrackingStore.getState().refresh()
  expect(readSavedTracking().historyByShop).toEqual({ a: ['second', 'first'], b: ['other'] })
  expect(sessionStorage.getItem(legacyTrackingKey)).toBeNull()
})

test('denied storage cannot interrupt checkout or destroy legacy session data', () => {
  sessionStorage.setItem(legacyTrackingKey, JSON.stringify({ state: { tokensByShop: { a: 'legacy' } } }))
  const original = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (this === localStorage) throw new DOMException('denied', 'SecurityError')
    original.call(this, key, value)
  })
  expect(() => useCustomerTrackingStore.getState().remember('a', 'new')).not.toThrow()
  expect(useCustomerTrackingStore.getState().tokensByShop.a).toBe('new')
  expect(sessionStorage.getItem(legacyTrackingKey)).not.toBeNull()
})
