import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { StaffOrder } from '../../domain/staff-order'
import { QueueOrderCard } from './QueueOrderCard'

const order: StaffOrder = { id: 'o', queueNumber: 12, orderReference: 'DP-012', source: 'QR', status: 'QUEUED', paymentStatus: 'UNPAID', totalSatang: 14700, createdAt: '2026-11-03T11:30:00+07:00', customerNote: 'แยกถุงให้ด้วย', payment: null, items: [
  { id: 'one', name: 'เคบับไก่', quantity: 2, lineTotalSatang: 9800, options: ['M', 'ซอสกระเทียม', 'ซอสเผ็ด'], note: 'ไม่ใส่หอม\nเผ็ดน้อย' },
  { id: 'two', name: 'เคบับเนื้อ', quantity: 1, lineTotalSatang: 4900, options: ['S', 'ซอสมะเขือเทศ'], note: '' },
] }
afterEach(cleanup)
test('kitchen details keep quantity, options and notes tied to the correct menu', () => {
  render(<QueueOrderCard order={order} pending={false} onStatus={vi.fn()} onPay={vi.fn()} />)
  expect(screen.getByRole('heading', { name: '012' })).toBeVisible()
  const items = within(screen.getByRole('list', { name: 'รายการอาหาร' })).getAllByRole('listitem')
  expect(within(items[0]!).getByLabelText('จำนวน 2 ชิ้น')).toBeVisible()
  expect(within(items[0]!).getByText('฿98.00')).toBeVisible()
  for (const text of ['เคบับไก่', 'M', 'ซอสกระเทียม', 'ซอสเผ็ด']) expect(within(items[0]!).getByText(text)).toBeVisible()
  expect(within(items[0]!).getByText(/ไม่ใส่หอม/)).toHaveTextContent('เผ็ดน้อย')
  expect(within(items[1]!).queryByText('ซอสกระเทียม')).not.toBeInTheDocument()
  expect(screen.getByText('แยกถุงให้ด้วย')).toBeVisible()
  expect(screen.getByText('สั่งผ่าน QR')).toBeVisible()
  expect(screen.getByText(/2 รายการ/)).toHaveTextContent('3 ชิ้น')
})
test('payment is secondary during preparation and can be opened without changing order status', () => {
  const status = vi.fn(), pay = vi.fn()
  render(<QueueOrderCard order={order} pending={false} onStatus={status} onPay={pay} />)
  expect(screen.queryByLabelText('วิธีชำระ')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'รับชำระ' }))
  expect(screen.getByLabelText('วิธีชำระ')).toHaveValue('BANK_TRANSFER')
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันรับชำระ' }))
  expect(pay).toHaveBeenCalledExactlyOnceWith('BANK_TRANSFER', 14700)
  expect(status).not.toHaveBeenCalled()
})
test('completion remains independent from payment, then pending collection opens automatically', () => {
  const status = vi.fn()
  const view = render(<QueueOrderCard order={{ ...order, status: 'PREPARING' }} pending={false} onStatus={status} onPay={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'เสร็จแล้ว' }))
  expect(status).toHaveBeenCalledExactlyOnceWith('PREPARING', 'COMPLETED')
  view.rerender(<QueueOrderCard order={{ ...order, status: 'COMPLETED' }} pending={false} onStatus={status} onPay={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'ยืนยันรับชำระ' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'เสร็จแล้ว' })).not.toBeInTheDocument()
})
test('paid orders have a visible payment state and cannot be cancelled', () => {
  render(<QueueOrderCard order={{ ...order, paymentStatus: 'PAID' }} pending={false} onStatus={vi.fn()} onPay={vi.fn()} />)
  expect(screen.getByText('ชำระแล้ว')).toBeVisible()
  expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'รับชำระ' })).not.toBeInTheDocument()
})
