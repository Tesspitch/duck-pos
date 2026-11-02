import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { CustomerOrderingContext } from '../../application/customer-ordering-context'
import type { TrackedOrder } from '../../domain/customer-order'
import { OrderTrackingPage } from './OrderTrackingPage'
import { useCustomerTrackingStore } from '../../application/customer-tracking-store'

const queued: TrackedOrder = { orderId: 'o', shopId: 'shop-a', shopName: 'ร้านทดสอบ', queueNumber: 12, orderReference: 'R12', status: 'QUEUED', totalSatang: 3900, createdAt: '', items: [{ name: 'เคบับ', quantity: 1, lineTotalSatang: 3900, options: [] }] }
const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; useCustomerTrackingStore.setState({ tokensByShop: {} }); vi.useRealTimers() })

function renderTracking(track: (token: string) => Promise<TrackedOrder | null>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  clients.push(client)
  render(<QueryClientProvider client={client}><CustomerOrderingContext value={{ track, checkout: vi.fn(), getMenu: vi.fn() }}><MemoryRouter initialEntries={['/track/secret-token']}><Routes><Route path="/track/:token" element={<OrderTrackingPage />} /><Route path="/order/:shopId" element={<p>เมนูร้านเดิม</p>} /></Routes></MemoryRouter></CustomerOrderingContext></QueryClientProvider>)
}

test('tracking polls through queued and ready, then stops at completed', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const track = vi.fn().mockResolvedValueOnce(queued).mockResolvedValueOnce({ ...queued, status: 'READY' }).mockResolvedValue({ ...queued, status: 'COMPLETED' })
  renderTracking(track)
  await screen.findByText('อยู่ในคิว')
  expect(track).toHaveBeenCalledWith('secret-token')
  await act(async () => { await vi.advanceTimersByTimeAsync(7000) })
  await screen.findByText('พร้อมรับอาหาร')
  await act(async () => { await vi.advanceTimersByTimeAsync(7000) })
  await screen.findByText('รับอาหารแล้ว')
  const completedCalls = track.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(21000) })
  expect(track).toHaveBeenCalledTimes(completedCalls)
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
