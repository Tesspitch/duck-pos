import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { QueuePage } from './QueuePage'
import type { OrderStatus } from '../../domain/staff-order'

const queue = vi.hoisted(() => ({ orders: [
  { id: 'a', status: 'QUEUED', paymentStatus: 'UNPAID' }, { id: 'b', status: 'PREPARING', paymentStatus: 'PAID' }, { id: 'c', status: 'READY', paymentStatus: 'UNPAID' },
  { id: 'd', status: 'COMPLETED', paymentStatus: 'PAID' }, { id: 'e', status: 'CANCELLED', paymentStatus: 'UNPAID' },
] as Array<{ id: string; status: string; paymentStatus?: string }> }))
vi.mock('../../../../shared/presentation/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../../../shop-context/application/active-shop-context', () => ({ useActiveShop: () => ({ activeMembership: { shop_id: 'shop', shops: { name: 'QA' } } }) }))
vi.mock('../../application/use-staff-orders', () => ({ useStaffOrders: () => ({ data: queue, isLoading: false, refetch: vi.fn() }) }))
vi.mock('../../application/use-staff-orders-realtime', () => ({ useStaffOrdersRealtime: () => 'CONNECTED' }))
vi.mock('../../application/use-staff-order-actions', () => ({ useUpdateOrderStatus: () => ({ mutate: vi.fn() }), useRecordOrderPayment: () => ({ mutate: vi.fn() }) }))
vi.mock('../components/QueueOrderCard', () => ({ QueueOrderCard: ({ order }: { order: { id: string; status: OrderStatus } }) => <article>{order.id}: {order.status}</article> }))
afterEach(cleanup)

test('opens with unfinished orders and excludes completed paid or cancelled orders', () => {
  render(<QueuePage />)
  expect(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 3' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByRole('article')).toHaveLength(3)
  expect(screen.queryByText('d: COMPLETED')).not.toBeInTheDocument()
  expect(screen.queryByText('e: CANCELLED')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'รอทำ 1' }))
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByText('a: QUEUED')).toBeVisible()
})

test('already paid work disappears only after food is completed', () => {
  const original = queue.orders
  try {
    queue.orders = [{ id: 'a', status: 'READY', paymentStatus: 'PAID' }]
    const view = render(<QueuePage />)
    expect(screen.getByText('a: READY')).toBeVisible()
    queue.orders = [{ id: 'a', status: 'COMPLETED', paymentStatus: 'PAID' }]
    view.rerender(<QueuePage />)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByText('ไม่มีออเดอร์ค้างแล้ว')).toBeVisible()
  } finally { queue.orders = original }
})

test('completed unpaid order stays in unfinished and pending collection, then leaves both after payment', () => {
  const original = queue.orders
  try {
    queue.orders = [{ id: 'unpaid', status: 'COMPLETED', paymentStatus: 'UNPAID' }]
    const view = render(<QueuePage />)
    expect(screen.getByText('unpaid: COMPLETED')).toBeVisible()
    expect(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 1' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'รอรับชำระ 1' }))
    expect(screen.getByText('unpaid: COMPLETED')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 1' }))
    queue.orders = [{ id: 'unpaid', status: 'COMPLETED', paymentStatus: 'PAID' }]
    view.rerender(<QueuePage />)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 0' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'รอรับชำระ 0' }))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  } finally { queue.orders = original }
})

test('marking food completed before payment does not remove it from the default category', () => {
  const original = queue.orders
  try {
    queue.orders = [{ id: 'a', status: 'PREPARING', paymentStatus: 'UNPAID' }]
    const view = render(<QueuePage />)
    queue.orders = [{ id: 'a', status: 'COMPLETED', paymentStatus: 'UNPAID' }]
    view.rerender(<QueuePage />)
    expect(screen.getByText('a: COMPLETED')).toBeVisible()
    expect(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'กำลังทำ 0' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'กำลังทำ 0' }))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  } finally { queue.orders = original }
})
