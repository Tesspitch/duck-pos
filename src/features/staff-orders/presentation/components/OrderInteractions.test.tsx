import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { StaffOrder } from '../../domain/staff-order'
import { PaymentPanel } from './PaymentPanel'
import { QueueOrderCard } from './QueueOrderCard'
import { PosCart } from './PosCart'
import { usePosCartStore } from '../../application/pos-cart-store'

const order: StaffOrder = { id: 'o', queueNumber: 7, orderReference: 'R7', source: 'POS', status: 'READY', paymentStatus: 'UNPAID', totalSatang: 4900, customerNote: '', createdAt: '', items: [], payment: null }
afterEach(() => { cleanup(); usePosCartStore.getState().clear() })

test('cash rejects underpayment and records the amount received with correct change', () => {
  const pay = vi.fn()
  render(<PaymentPanel order={order} pending={false} onPay={pay} />)
  fireEvent.change(screen.getByLabelText('วิธีชำระ'), { target: { value: 'CASH' } })
  fireEvent.change(screen.getByLabelText('ยอดรับ (บาท)'), { target: { value: '40' } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันรับชำระ' }))
  expect(pay).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('น้อยกว่า')
  fireEvent.change(screen.getByLabelText('ยอดรับ (บาท)'), { target: { value: '100' } })
  expect(screen.getByText('เงินทอน ฿51.00')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันรับชำระ' }))
  expect(pay).toHaveBeenCalledExactlyOnceWith('CASH', 10000)
})

test('transfer uses the order total and pending payment locks all inputs', () => {
  const pay = vi.fn()
  const view = render(<PaymentPanel order={order} pending={false} onPay={pay} />)
  expect(screen.getByLabelText('วิธีชำระ')).toHaveValue('BANK_TRANSFER')
  expect(screen.getByLabelText('ยอดรับ (บาท)')).toHaveValue(49)
  expect(screen.getByLabelText('ยอดรับ (บาท)')).toHaveAttribute('readonly')
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันรับชำระ' }))
  expect(pay).toHaveBeenCalledExactlyOnceWith('BANK_TRANSFER', 4900)
  view.rerender(<PaymentPanel order={order} pending onPay={pay} />)
  expect(screen.getByLabelText('วิธีชำระ')).toBeDisabled()
  expect(screen.getByLabelText('ยอดรับ (บาท)')).toBeDisabled()
  expect(screen.getByRole('button')).toBeDisabled()
})

test('queue allows completion before payment and still requires a cancellation reason', () => {
  const status = vi.fn()
  render(<QueueOrderCard order={order} pending={false} onStatus={status} onPay={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'เสร็จแล้ว' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันยกเลิกออเดอร์' }))
  expect(status).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('เหตุผลยกเลิก'), { target: { value: 'ลูกค้าขอยกเลิก' } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันยกเลิกออเดอร์' }))
  expect(status).toHaveBeenCalledExactlyOnceWith('READY', 'CANCELLED', 'ลูกค้าขอยกเลิก')
})

test('queued order starts cooking without implicitly recording payment', () => {
  const status = vi.fn()
  const pay = vi.fn()
  render(<QueueOrderCard order={{ ...order, status: 'QUEUED' }} pending={false} onStatus={status} onPay={pay} />)
  fireEvent.click(screen.getByRole('button', { name: 'เริ่มทำ' }))
  expect(status).toHaveBeenCalledExactlyOnceWith('QUEUED', 'PREPARING')
  expect(pay).not.toHaveBeenCalled()
})

test('completed unpaid order keeps payment controls and has no completion/cancel action', () => {
  render(<QueueOrderCard order={{ ...order, status: 'COMPLETED' }} pending={false} onStatus={vi.fn()} onPay={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'ยืนยันรับชำระ' })).toBeEnabled()
  expect(screen.queryByRole('button', { name: 'เสร็จแล้ว' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'ยกเลิก' })).not.toBeInTheDocument()
})

test('paid ready order completes without showing payment inputs', () => {
  const status = vi.fn()
  render(<QueueOrderCard order={{ ...order, paymentStatus: 'PAID' }} pending={false} onStatus={status} onPay={vi.fn()} />)
  expect(screen.queryByLabelText('ยอดรับ (บาท)')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'เสร็จแล้ว' }))
  expect(status).toHaveBeenCalledExactlyOnceWith('READY', 'COMPLETED')
})

test.each(['PREPARING', 'READY'] as const)('paid %s order completes in one click without intermediate buttons', (statusValue) => {
  const status = vi.fn()
  render(<QueueOrderCard order={{ ...order, status: statusValue, paymentStatus: 'PAID' }} pending={false} onStatus={status} onPay={vi.fn()} />)
  expect(screen.queryByRole('button', { name: 'เริ่มทำ' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'อาหารพร้อม' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'เสร็จแล้ว' }))
  expect(status).toHaveBeenCalledExactlyOnceWith(statusValue, 'COMPLETED')
})

test('POS confirmation locks quantity, remove, note and submit while sending', () => {
  usePosCartStore.setState({ lines: [{ key: 'p', productId: 'p', productName: 'เคบับ', quantity: 1, basePriceSatang: 4900, options: [], note: '' }] })
  render(<PosCart disabled={false} pending error={null} onSubmit={vi.fn()} productImages={{ p: '/menu.jpg' }} />)
  expect(screen.getByRole('img', { name: 'เคบับ' })).toBeVisible()
  for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
  expect(screen.getByRole('textbox')).toBeDisabled()
})

test('POS quantity stays within limits and last removal returns to menu', () => {
  usePosCartStore.setState({ lines: [{ key: 'p', productId: 'p', productName: 'เคบับ', quantity: 1, basePriceSatang: 4900, options: [], note: '' }] })
  const onEmpty = vi.fn()
  render(<PosCart disabled={false} pending={false} error={null} onSubmit={vi.fn()} onEmpty={onEmpty} />)
  expect(screen.getByRole('button', { name: 'ลดจำนวน เคบับ' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'เพิ่มจำนวน เคบับ' }))
  expect(usePosCartStore.getState().lines[0]?.quantity).toBe(2)
  fireEvent.click(screen.getByRole('button', { name: 'ลบ เคบับ' }))
  expect(onEmpty).toHaveBeenCalledOnce()
  expect(usePosCartStore.getState().lines).toHaveLength(0)
})
