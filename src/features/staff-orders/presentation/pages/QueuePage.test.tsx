import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { QueuePage } from './QueuePage'
import type { OrderStatus } from '../../domain/staff-order'

const queue = vi.hoisted(() => ({ orders: [
  { id: 'a', status: 'QUEUED' }, { id: 'b', status: 'PREPARING' }, { id: 'c', status: 'READY' },
  { id: 'd', status: 'COMPLETED' }, { id: 'e', status: 'CANCELLED' },
] }))
vi.mock('../../../../shared/presentation/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../../../shop-context/application/active-shop-context', () => ({ useActiveShop: () => ({ activeMembership: { shop_id: 'shop', shops: { name: 'QA' } } }) }))
vi.mock('../../application/use-staff-orders', () => ({ useStaffOrders: () => ({ data: queue, isLoading: false, refetch: vi.fn() }) }))
vi.mock('../../application/use-staff-orders-realtime', () => ({ useStaffOrdersRealtime: () => 'CONNECTED' }))
vi.mock('../../application/use-staff-order-actions', () => ({ useUpdateOrderStatus: () => ({ mutate: vi.fn() }), useRecordOrderPayment: () => ({ mutate: vi.fn() }) }))
vi.mock('../components/QueueOrderCard', () => ({ QueueOrderCard: ({ order }: { order: { id: string; status: OrderStatus } }) => <article>{order.id}: {order.status}</article> }))
afterEach(cleanup)

test('opens with unfinished orders and excludes completed or cancelled orders', () => {
  render(<QueuePage />)
  expect(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 3' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByRole('article')).toHaveLength(3)
  expect(screen.queryByText('d: COMPLETED')).not.toBeInTheDocument()
  expect(screen.queryByText('e: CANCELLED')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'รอทำ 1' }))
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByText('a: QUEUED')).toBeVisible()
})

test('completed work disappears when queue data refreshes and shows the empty state', () => {
  const original = queue.orders
  try {
    queue.orders = [{ id: 'a', status: 'READY' }]
    const view = render(<QueuePage />)
    expect(screen.getByText('a: READY')).toBeVisible()
    queue.orders = [{ id: 'a', status: 'COMPLETED' }]
    view.rerender(<QueuePage />)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByText('ไม่มีออเดอร์ค้างแล้ว')).toBeVisible()
  } finally { queue.orders = original }
})
