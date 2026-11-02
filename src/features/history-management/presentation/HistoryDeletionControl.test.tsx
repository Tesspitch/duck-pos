import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { HistoryDeletionContext } from '../application/history-deletion-context'
import { HistoryDeletionControl } from './HistoryDeletionControl'

const summary = { count: 2, grossSatang: 9800, collectedSatang: 9800, fingerprint: 'server-fingerprint', blockedReason: null }
const clients: QueryClient[] = []
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }; HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }; window.scrollTo = vi.fn() })
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0 })
function setup(preview = vi.fn().mockResolvedValue(summary), remove = vi.fn().mockResolvedValue(summary)) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } }); clients.push(client)
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><HistoryDeletionContext value={{ preview, remove }}><HistoryDeletionControl shopId="shop" shopName="ร้านทดสอบ" kind="SALES" dateFrom="2026-11-01" dateTo="2026-11-02" /></HistoryDeletionContext></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'ตัวเลือก ลบประวัติการขาย' }))
  fireEvent.click(screen.getByRole('button', { name: 'ลบประวัติการขาย' }))
  return { preview, remove, invalidate }
}
test('preview and exact-name confirmation are required before deleting the reviewed date range', async () => {
  const { preview, remove, invalidate } = setup()
  expect(screen.queryByRole('button', { name: 'ยืนยันลบถาวร' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบรายการที่จะลบ' }))
  await screen.findByText('2 รายการ')
  expect(preview).toHaveBeenCalledWith({ shopId: 'shop', kind: 'SALES', dateFrom: '2026-11-01', dateTo: '2026-11-02' })
  expect(screen.getByRole('button', { name: 'ยืนยันลบถาวร' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('พิมพ์ชื่อร้านเพื่อยืนยัน'), { target: { value: 'ร้านอื่น' } })
  expect(screen.getByRole('button', { name: 'ยืนยันลบถาวร' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('พิมพ์ชื่อร้านเพื่อยืนยัน'), { target: { value: 'ร้านทดสอบ' } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบถาวร' }))
  await waitFor(() => expect(remove).toHaveBeenCalledWith({ shopId: 'shop', kind: 'SALES', dateFrom: '2026-11-01', dateTo: '2026-11-02', fingerprint: 'server-fingerprint', confirmationName: 'ร้านทดสอบ' }))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sales-dashboard', 'shop'] }))
})
test('changing dates invalidates the reviewed summary and name confirmation', async () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบรายการที่จะลบ' }))
  await screen.findByText('2 รายการ')
  fireEvent.change(screen.getByLabelText('ถึงวันที่'), { target: { value: '2026-11-03' } })
  expect(screen.queryByRole('button', { name: 'ยืนยันลบถาวร' })).not.toBeInTheDocument()
  expect(screen.queryByText('2 รายการ')).not.toBeInTheDocument()
})
test.each(['CLOSE_STORE_FIRST', 'RESOLVE_ORDERS_FIRST'])('server safeguard %s never exposes the final delete action', async (blockedReason) => {
  setup(vi.fn().mockResolvedValue({ ...summary, blockedReason }))
  fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบรายการที่จะลบ' }))
  await screen.findByRole('alert')
  expect(screen.queryByRole('button', { name: 'ยืนยันลบถาวร' })).not.toBeInTheDocument()
})
test('a changed server snapshot rejects deletion and asks for another preview', async () => {
  setup(vi.fn().mockResolvedValue(summary), vi.fn().mockRejectedValue(new Error('History changed. Preview again before deleting.')))
  fireEvent.click(screen.getByRole('button', { name: 'ตรวจสอบรายการที่จะลบ' }))
  await screen.findByText('2 รายการ')
  fireEvent.change(screen.getByLabelText('พิมพ์ชื่อร้านเพื่อยืนยัน'), { target: { value: 'ร้านทดสอบ' } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบถาวร' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('ข้อมูลเปลี่ยนแล้ว')
})
