import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { QueuePage } from './QueuePage'
import { MemoryRouter } from 'react-router-dom'
import type { StaffOrder } from '../../domain/staff-order'

const queue = vi.hoisted(() => ({ orders: [
  { id: 'a', status: 'QUEUED', paymentStatus: 'UNPAID' }, { id: 'b', status: 'PREPARING', paymentStatus: 'PAID' }, { id: 'c', status: 'READY', paymentStatus: 'UNPAID' },
  { id: 'd', status: 'COMPLETED', paymentStatus: 'PAID' }, { id: 'e', status: 'CANCELLED', paymentStatus: 'UNPAID' },
] as Array<{ id: string; status: string; paymentStatus?: string }> }))
vi.mock('../../../../shared/presentation/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../../../shop-context/application/active-shop-context', () => ({ useActiveShop: () => ({ activeMembership: { shop_id: 'shop', shops: { name: 'QA' } } }) }))
vi.mock('../../application/use-staff-orders', () => ({ useStaffOrders: () => ({ data: {orders:queue.orders.map((order,index):StaffOrder=>({
  id:order.id, status:order.status as StaffOrder['status'], paymentStatus:(order.paymentStatus??'UNPAID') as StaffOrder['paymentStatus'],
  queueNumber:index+1, orderReference:order.id, items:[], source:'QR', totalSatang:0, customerNote:'', createdAt:'2026-11-06T03:00:00Z', payment:null,
}))}, isLoading: false, refetch: vi.fn() }) }))
vi.mock('../../application/use-staff-orders-realtime', () => ({ useStaffOrdersRealtime: () => 'CONNECTED' }))
vi.mock('../../application/use-staff-order-actions', () => ({ useUpdateOrderStatus: () => ({ mutate: vi.fn() }), useRecordOrderPayment: () => ({ mutate: vi.fn() }) }))
function Page(){return <MemoryRouter><QueuePage/></MemoryRouter>}
afterEach(cleanup)

test('opens with unfinished orders and excludes completed paid or cancelled orders', () => {
  render(<Page />)
  expect(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 3' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByRole('article')).toHaveLength(3)
  expect(screen.queryByText('d')).not.toBeInTheDocument()
  expect(screen.queryByText('e')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('navigation',{name:'กรองสถานะคิว'}).querySelector('button:nth-child(2)')!)
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByText('a')).toBeVisible()
})

test('already paid work disappears only after food is completed', () => {
  const original = queue.orders
  try {
    queue.orders = [{ id: 'a', status: 'READY', paymentStatus: 'PAID' }]
    const view = render(<Page />)
    expect(screen.getByText('a')).toBeVisible()
    queue.orders = [{ id: 'a', status: 'COMPLETED', paymentStatus: 'PAID' }]
    view.rerender(<Page />)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByText('ไม่มีออเดอร์ค้างแล้ว')).toBeVisible()
  } finally { queue.orders = original }
})

test('completed unpaid order stays in unfinished and pending collection, then leaves both after payment', () => {
  const original = queue.orders
  try {
    queue.orders = [{ id: 'unpaid', status: 'COMPLETED', paymentStatus: 'UNPAID' }]
    const view = render(<Page />)
    expect(screen.getByText('unpaid')).toBeVisible()
    expect(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 1' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'รอรับชำระ 1' }))
    expect(screen.getByText('unpaid')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 1' }))
    queue.orders = [{ id: 'unpaid', status: 'COMPLETED', paymentStatus: 'PAID' }]
    view.rerender(<Page />)
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
    const view = render(<Page />)
    queue.orders = [{ id: 'a', status: 'COMPLETED', paymentStatus: 'UNPAID' }]
    view.rerender(<Page />)
    expect(screen.getByText('a')).toBeVisible()
    expect(screen.getByRole('button', { name: 'ยังไม่สำเร็จ 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('navigation',{name:'กรองสถานะคิว'}).querySelector('button:nth-child(3)')!).toBeVisible()
    fireEvent.click(screen.getByRole('navigation',{name:'กรองสถานะคิว'}).querySelector('button:nth-child(3)')!)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  } finally { queue.orders = original }
})
