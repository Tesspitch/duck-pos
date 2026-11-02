import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { CustomerOrderingContext } from '../../application/customer-ordering-context'
import type { TrackedOrder } from '../../domain/customer-order'
import { CancelCustomerOrder } from './CancelCustomerOrder'

const order: TrackedOrder = { orderId: 'order', shopId: 'shop', shopName: 'ร้าน', queueNumber: 7, orderReference: 'R7', status: 'QUEUED', paymentStatus: 'UNPAID', totalSatang: 3900, createdAt: '', items: [] }
const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0 })
function setup(value = order, cancel = vi.fn().mockResolvedValue(undefined)) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  clients.push(client)
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><CustomerOrderingContext value={{ cancel, track: vi.fn(), checkout: vi.fn(), getMenu: vi.fn() }}><CancelCustomerOrder token="private-token" order={value} /></CustomerOrderingContext></QueryClientProvider>)
  return { cancel, invalidate }
}
test('cancellation requires confirmation, passes only the token and refreshes server status', async () => {
  const { cancel, invalidate } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกออเดอร์' }))
  expect(cancel).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'เก็บออเดอร์ไว้' }))
  expect(cancel).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกออเดอร์' }))
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันยกเลิก' }))
  await waitFor(() => expect(cancel).toHaveBeenCalledExactlyOnceWith('private-token'))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['customer-order-tracking', 'private-token'] }))
})
test.each(['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const)('customer cannot cancel %s in the UI', (status) => {
  setup({ ...order, status })
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
test('paid queued orders refer the customer to the shop', () => {
  setup({ ...order, paymentStatus: 'PAID' })
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getByText(/กรุณาติดต่อร้าน/)).toBeVisible()
})
test('server rejection refreshes status and never claims cancellation succeeded', async () => {
  const { invalidate } = setup(order, vi.fn().mockRejectedValue(new Error('Preparation has started.')))
  fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกออเดอร์' }))
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันยกเลิก' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('ยกเลิกไม่สำเร็จ')
  expect(invalidate).toHaveBeenCalled()
})
