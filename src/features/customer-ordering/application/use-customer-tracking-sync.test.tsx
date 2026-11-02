import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { useCustomerTrackingSync } from './use-customer-tracking-sync'
import { useCustomerTrackingStore } from './customer-tracking-store'
import { saveTrackingOrder, trackingRecordPrefix } from '../infrastructure/customer-tracking-storage'

afterEach(() => {
  cleanup(); localStorage.clear(); sessionStorage.clear()
  useCustomerTrackingStore.setState({ tokensByShop: {}, historyByShop: {} })
})

test('another tab adding an order updates the current tab through storage events', () => {
  renderHook(useCustomerTrackingSync)
  act(() => useCustomerTrackingStore.getState().remember('shop', 'first'))
  saveTrackingOrder('shop', 'second')
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: `${trackingRecordPrefix}shop.second`, storageArea: localStorage })))
  expect(useCustomerTrackingStore.getState().historyByShop.shop).toEqual(['second', 'first'])
  expect(useCustomerTrackingStore.getState().tokensByShop.shop).toBe('second')
})

test('focus restores missed updates and unmount removes the listeners', () => {
  const view = renderHook(useCustomerTrackingSync)
  saveTrackingOrder('shop', 'first')
  act(() => window.dispatchEvent(new Event('focus')))
  expect(useCustomerTrackingStore.getState().historyByShop.shop).toEqual(['first'])
  view.unmount()
  saveTrackingOrder('shop', 'second')
  act(() => window.dispatchEvent(new Event('focus')))
  expect(useCustomerTrackingStore.getState().historyByShop.shop).toEqual(['first'])
})
