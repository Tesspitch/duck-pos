import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { CustomerOrderingContext } from '../../application/customer-ordering-context'
import type { TrackedOrder } from '../../domain/customer-order'
import { OrderTrackingPage } from './OrderTrackingPage'
import { useCustomerTrackingStore } from '../../application/customer-tracking-store'

const queued: TrackedOrder = { orderId: 'o', shopId: 'shop-a', shopName: 'ร้านทดสอบ', queueNumber: 12, orderReference: 'R12', status: 'QUEUED', paymentStatus: 'UNPAID', totalSatang: 3900, createdAt: '', items: [{ name: 'เคบับ', quantity: 1, lineTotalSatang: 3900, options: [] }] }
const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; useCustomerTrackingStore.setState({ tokensByShop: {}, historyByShop: {} }); localStorage.clear(); sessionStorage.clear(); vi.useRealTimers() })

function renderTracking(track: (token: string) => Promise<TrackedOrder | null>, cancel = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  clients.push(client)
  render(<QueryClientProvider client={client}><CustomerOrderingContext value={{ track, cancel, checkout: vi.fn(), getMenu: vi.fn() }}><MemoryRouter initialEntries={['/track/secret-token']}><Routes><Route path="/track/:token" element={<OrderTrackingPage />} /><Route path="/order/:shopId" element={<p>เมนูร้านเดิม</p>} /></Routes></MemoryRouter></CustomerOrderingContext></QueryClientProvider>)
}

test('customer cancellation refreshes the actual tracking page and stops polling', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  let current = queued
  const track = vi.fn(async () => current)
  renderTracking(track, vi.fn(async () => { current = { ...queued, status: 'CANCELLED' } }))
  fireEvent.click(await screen.findByRole('button', { name: 'ยกเลิกออเดอร์' }))
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันยกเลิก' }))
  await screen.findByText('ยกเลิกแล้ว')
  expect(screen.queryByRole('button', { name: 'ยกเลิกออเดอร์' })).not.toBeInTheDocument()
  const calls = track.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(21000) })
  expect(track).toHaveBeenCalledTimes(calls)
})

test('staff starting preparation removes the customer cancellation action on refresh', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const track = vi.fn().mockResolvedValueOnce(queued).mockResolvedValue({ ...queued, status: 'PREPARING' })
  renderTracking(track)
  await screen.findByRole('button', { name: 'ยกเลิกออเดอร์' })
  await act(async () => { await vi.advanceTimersByTimeAsync(7000) })
  await screen.findByText('กำลังทำ')
  expect(screen.queryByRole('button', { name: 'ยกเลิกออเดอร์' })).not.toBeInTheDocument()
})

test('tracking polls through queued and ready, then stops at completed', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const track = vi.fn().mockResolvedValueOnce(queued).mockResolvedValueOnce({ ...queued, status: 'READY' }).mockResolvedValue({ ...queued, status: 'COMPLETED' })
  renderTracking(track)
  await screen.findByText('อยู่ในคิว')
  expect(track).toHaveBeenCalledWith('secret-token')
  await act(async () => { await vi.advanceTimersByTimeAsync(7000) })
  await screen.findByText('พร้อมรับอาหาร')
  await act(async () => { await vi.advanceTimersByTimeAsync(7000) })
  await screen.findByText('เสร็จแล้ว')
  const completedCalls = track.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(21000) })
  expect(track).toHaveBeenCalledTimes(completedCalls)
})

test('customer observes direct queued-to-completed transition and polling stops', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const track = vi.fn().mockResolvedValueOnce(queued).mockResolvedValue({ ...queued, status: 'COMPLETED' })
  renderTracking(track)
  await screen.findByText('อยู่ในคิว')
  await act(async () => { await vi.advanceTimersByTimeAsync(7000) })
  await screen.findByText('เสร็จแล้ว')
  expect(screen.queryByRole('button', { name: /แจ้งเตือน/ })).not.toBeInTheDocument()
  const calls = track.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(21000) })
  expect(track).toHaveBeenCalledTimes(calls)
})

test('temporary tracking failure offers retry without claiming the token is invalid', async () => {
  const track = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(queued)
  renderTracking(track)
  await screen.findByText('โหลดสถานะไม่สำเร็จ กรุณาลองใหม่')
  fireEvent.click(screen.getByRole('button', { name: 'ลองใหม่' }))
  await screen.findByText('อยู่ในคิว')
})

test('unknown token shows a missing order without exposing another order', async () => {
  renderTracking(vi.fn().mockResolvedValue(null))
  await screen.findByText('ไม่พบออเดอร์หรือลิงก์ไม่ถูกต้อง')
  expect(screen.queryByText('R12')).not.toBeInTheDocument()
})

test('tracking navigation opens the correct shop and remembers a shop-scoped return link', async () => {
  renderTracking(vi.fn().mockResolvedValue(queued))
  await screen.findByText('อยู่ในคิว')
  expect(screen.getByRole('link', { name: 'สถานะออเดอร์' })).toHaveAttribute('aria-current', 'page')
  expect(useCustomerTrackingStore.getState().tokensByShop).toEqual({ 'shop-a': 'secret-token' })
  fireEvent.click(screen.getByRole('button', { name: 'เมนู' }))
  await screen.findByText('เมนูร้านเดิม')
})

test('two orders remain available and customer can switch to the earlier queue', async () => {
  const { remember } = useCustomerTrackingStore.getState()
  remember('shop-a', 'earlier-token')
  remember('shop-a', 'secret-token')
  remember('other-shop', 'unrelated-token')
  const track = vi.fn(async (token: string) => token === 'earlier-token'
    ? { ...queued, orderId: 'earlier', queueNumber: 11, orderReference: 'R11' }
    : queued)
  renderTracking(track)
  await screen.findByRole('heading', { name: '012' })
  expect(await screen.findByRole('heading', { name: 'ออเดอร์ของคุณ · 2' })).toBeVisible()
  fireEvent.click(await screen.findByRole('link', { name: 'คิว 011 R11' }))
  await screen.findByRole('heading', { name: '011' })
  expect(screen.getByRole('link', { name: 'คิว 012 R12' })).toBeVisible()
  expect(useCustomerTrackingStore.getState().historyByShop['shop-a']).toEqual(['secret-token', 'earlier-token'])
  expect(track).not.toHaveBeenCalledWith('unrelated-token')
})
