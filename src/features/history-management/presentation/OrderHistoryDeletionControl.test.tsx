import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { HistoryDeletionContext } from '../application/history-deletion-context'
import { OrderHistoryDeletionControl } from './OrderHistoryDeletionControl'

const summary = { count: 1, grossSatang: 5900, collectedSatang: 5900, fingerprint: 'order-fingerprint', blockedReason: null, orderReference: 'DP-001', queueNumber: 3 }
const clients: QueryClient[] = []
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }; HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }; window.scrollTo = vi.fn() })
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0 })

function setup(previewOrder = vi.fn().mockResolvedValue(summary), removeOrder = vi.fn().mockResolvedValue(summary)) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } }); clients.push(client)
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><HistoryDeletionContext value={{ preview: vi.fn(), remove: vi.fn(), previewOrder, removeOrder }}><OrderHistoryDeletionControl shopId="shop" shopName="ร้านทดสอบ" orderId="order" orderReference="DP-001" /></HistoryDeletionContext></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'ตัวเลือก ออเดอร์ DP-001' }))
  fireEvent.click(screen.getByRole('button', { name: 'ลบออเดอร์นี้' }))
  return { previewOrder, removeOrder, invalidate }
}

test('owner previews and confirms exact shop name before deleting one order', async () => {
  const { previewOrder, removeOrder, invalidate } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบก่อนลบ' }))
  await screen.findByText('คิว 3 · DP-001')
  expect(previewOrder).toHaveBeenCalledWith({ shopId: 'shop', orderId: 'order' })
  expect(screen.getByRole('button', { name: 'ยืนยันลบออเดอร์ถาวร' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('พิมพ์ชื่อร้านเพื่อยืนยัน'), { target: { value: 'ร้านทดสอบ' } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบออเดอร์ถาวร' }))
  await waitFor(() => expect(removeOrder).toHaveBeenCalledWith({ shopId: 'shop', orderId: 'order', fingerprint: 'order-fingerprint', confirmationName: 'ร้านทดสอบ' }))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sales-history', 'shop'] }))
})

test('unfinished order shows the safeguard and no delete confirmation', async () => {
  setup(vi.fn().mockResolvedValue({ ...summary, blockedReason: 'RESOLVE_ORDER_FIRST' }))
  fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบก่อนลบ' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('ออเดอร์เสร็จและรับชำระแล้ว')
  expect(screen.queryByRole('button', { name: 'ยืนยันลบออเดอร์ถาวร' })).not.toBeInTheDocument()
})
