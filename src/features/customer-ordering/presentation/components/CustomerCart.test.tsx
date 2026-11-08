import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { CustomerLocationContext } from '../../application/customer-location-context'
import { CustomerOrderingContext } from '../../application/customer-ordering-context'
import { useCartStore } from '../../application/cart-store'
import { CustomerCart } from './CustomerCart'
import { useCustomerTrackingStore } from '../../application/customer-tracking-store'
import { findSavedRound } from '../../../dining/application/round-memory'
import type { TableOrderContext } from '../../../dining/domain/dining'

const capture = vi.fn()
const checkout = vi.fn()
const line = { key: 'line', productId: 'p', productName: 'เคบับ', basePriceSatang: 3900, quantity: 1, note: '', options: [] }
const location = { latitude: 13, longitude: 100, accuracyM: 10, capturedAt: '2026-11-02T00:00:00Z' }
const result = { orderId: 'o', queueNumber: 1, orderReference: 'R1', trackingToken: 'token', status: 'QUEUED', totalSatang: 3900 }

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  useCartStore.setState({ shopId: 'shop', lines: [line] })
  capture.mockResolvedValue(location)
  checkout.mockResolvedValue(result)
})
afterEach(() => { cleanup(); useCartStore.getState().clear(); useCustomerTrackingStore.setState({ tokensByShop: {}, historyByShop: {} }); localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); vi.resetAllMocks() })

function openCart(shopOpen = true,tableOrder?:TableOrderContext) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CustomerLocationContext value={{ capture }}><CustomerOrderingContext value={{ checkout, cancel: vi.fn(), getMenu: vi.fn(), track: vi.fn() }}><MemoryRouter><Routes><Route path="/" element={<CustomerCart shopId="shop" shopOpen={shopOpen} tableOrder={tableOrder} productImages={{ p: '/menu.jpg' }} />} /><Route path="/track/:token" element={<p>ติดตามออเดอร์</p>} /><Route path="/table-round/:guestToken" element={<p>ติดตามโต๊ะ</p>}/></Routes></MemoryRouter></CustomerOrderingContext></CustomerLocationContext></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: /ดูตะกร้า/ }))
}

test('automatic table checkout remembers the server bill and preserves the guest epoch',async()=>{
 capture.mockRejectedValue(new Error('Location permission denied'))
 const tableOrder={billId:'10000000-0000-4000-8000-000000000001',guestToken:'20000000-0000-4000-8000-000000000001',tableQrToken:'30000000-0000-4000-8000-000000000001',tableName:'โต๊ะ 1',tableEpoch:'10000000-0000-4000-8000-000000000001'}
 checkout.mockResolvedValue({...result,tableBillId:'40000000-0000-4000-8000-000000000001'})
 openCart(true,tableOrder)
 fireEvent.click(screen.getByRole('button',{name:'ดำเนินการต่อ'}))
 fireEvent.click(screen.getByRole('button',{name:/ยืนยันออเดอร์/}))
 await screen.findByText('ติดตามโต๊ะ')
  expect(capture).not.toHaveBeenCalled()
  expect(checkout.mock.calls[0]?.[0].location).toBeUndefined()
 expect(checkout.mock.calls[0]?.[0].tableOrder).toEqual(tableOrder)
 // The test shop ID is deliberately a fixture string; inspect raw stored data instead of UUID validation.
 expect(localStorage.getItem('duckpos.dining.table.'+tableOrder.tableQrToken)).toBe('40000000-0000-4000-8000-000000000001')
 expect(localStorage.getItem('duckpos.dining.round.40000000-0000-4000-8000-000000000001')).toContain(tableOrder.tableEpoch)
 expect(findSavedRound('unknown')).toBeNull()
})

test('closed shop allows cart review but prevents checkout', () => {
  openCart(false)
  expect(screen.getByRole('img', { name: 'เคบับ' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'ร้านปิดอยู่' })).toBeDisabled()
  expect(capture).not.toHaveBeenCalled()
})

test('locks checkout during location capture, submits once, then shows tracking', async () => {
  let resolveCapture!: (value: typeof location) => void
  capture.mockReturnValue(new Promise((resolve) => { resolveCapture = resolve }))
  openCart()
  fireEvent.click(screen.getByRole('button',{name:'ดำเนินการต่อ'}))
  const submit = screen.getByRole('button', { name: /ยืนยันออเดอร์/ })
  fireEvent.click(submit)
  fireEvent.click(submit)
  expect(capture).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'ย้อนกลับ' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'เมนู' })).toBeDisabled()
  resolveCapture(location)
  await screen.findByText('ติดตามออเดอร์')
  expect(checkout).toHaveBeenCalledTimes(1)
  expect(checkout.mock.calls[0]?.[0]).toMatchObject({ shopId: 'shop', location, lines: [line] })
  expect(useCartStore.getState().lines).toHaveLength(0)
})

test('cart navigation is inside the modal and returns to menu without losing items', () => {
  openCart()
  const dialog = screen.getByRole('dialog')
  const navigation = screen.getByRole('navigation', { name: 'เมนูลูกค้า' })
  expect(dialog).toContainElement(navigation)
  expect(screen.getByRole('button', { name: /ตะกร้า$/ })).toHaveAttribute('aria-current', 'page')
  fireEvent.click(screen.getByRole('button', { name: 'เมนู' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(useCartStore.getState().lines).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'เมนู' })).toHaveAttribute('aria-current', 'page')
  fireEvent.click(screen.getByRole('button', { name: /ตะกร้า$/ }))
  expect(screen.getByRole('dialog')).toBeVisible()
})

test('menu offers the remembered status link for this shop only', () => {
  useCustomerTrackingStore.setState({ tokensByShop: { shop: 'my-token', other: 'other-token' } })
  openCart()
  expect(screen.getByRole('link', { name: 'สถานะออเดอร์' })).toHaveAttribute('href', '/track/my-token')
  expect(screen.queryByRole('link', { name: 'other-token' })).not.toBeInTheDocument()
})

test('location denial retains cart and allows retry without sending an order', async () => {
  capture.mockRejectedValueOnce(new Error('กรุณาอนุญาตตำแหน่ง'))
  openCart()
  fireEvent.click(screen.getByRole('button',{name:'ดำเนินการต่อ'}))
  fireEvent.click(screen.getByRole('button', { name: /ยืนยันออเดอร์/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('กรุณาอนุญาตตำแหน่ง')
  expect(checkout).not.toHaveBeenCalled()
  expect(useCartStore.getState().lines).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'ตรวจสอบตำแหน่งอีกครั้ง' })).toBeEnabled()
})

test('network retry reuses the checkout identity instead of creating a duplicate', async () => {
  checkout.mockRejectedValueOnce(new Error('เครือข่ายขัดข้อง'))
  openCart()
  fireEvent.click(screen.getByRole('button',{name:'ดำเนินการต่อ'}))
  fireEvent.click(screen.getByRole('button', { name: /ยืนยันออเดอร์/ }))
  await screen.findByRole('alert')
  await waitFor(() => expect(screen.getByRole('button', { name: /ยืนยันออเดอร์/ })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: /ยืนยันออเดอร์/ }))
  await screen.findByText('ติดตามออเดอร์')
  expect(checkout.mock.calls[1]?.[0].idempotencyKey).toBe(checkout.mock.calls[0]?.[0].idempotencyKey)
  expect(checkout.mock.calls[1]?.[0].trackingToken).toBe(checkout.mock.calls[0]?.[0].trackingToken)
})

test('removing the last item returns to menu and adding a new item keeps cart collapsed', () => {
  openCart()
  fireEvent.click(screen.getByRole('button', { name: 'ลบ เคบับ' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'ตะกร้า' })).toBeDisabled()
  act(() => useCartStore.getState().addLine({ ...line, key: 'new-line' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /ดูตะกร้า/ })).toHaveAttribute('aria-expanded', 'false')
})
