import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { PlatformAdminRepositoryContext } from '../../application/platform-admin-repository-context'
import { PlatformShopList } from './PlatformShopList'

const clients: QueryClient[] = []
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  window.scrollTo = vi.fn()
})
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0 })
function setup(remove = vi.fn().mockResolvedValue(undefined),open=false) {
  const close=vi.fn().mockResolvedValue(undefined)
  const pause=vi.fn().mockResolvedValue(undefined)
  const list = vi.fn().mockResolvedValue({ shops: [{ id: 'shop-1', name: 'ร้านทดสอบ',isOpen:open,acceptingOrders:open,activeSessionId:open?'session-1':null }], hasMore: false })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  render(<QueryClientProvider client={client}><PlatformAdminRepositoryContext value={{ closeShop:close,pauseShop:pause,isPlatformAdmin: vi.fn(), listShopCreationGrants: vi.fn(), grantShopCreation: vi.fn(), revokeShopCreation: vi.fn(), listShops: list, deleteShop: remove }}><PlatformShopList /></PlatformAdminRepositoryContext></QueryClientProvider>)
  return { list, remove, close, pause }
}
test('admin must confirm the exact shop name before deleting and the list refreshes', async () => {
  const { list, remove } = setup()
  fireEvent.click(await screen.findByRole('button', { name: 'ลบร้าน ร้านทดสอบ' }))
  expect(screen.getByRole('button', { name: 'ยืนยันลบร้าน' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('พิมพ์ชื่อร้านเพื่อยืนยัน'), { target: { value: 'ร้านผิด' } })
  expect(screen.getByRole('button', { name: 'ยืนยันลบร้าน' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('พิมพ์ชื่อร้านเพื่อยืนยัน'), { target: { value: 'ร้านทดสอบ' } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบร้าน' }))
  await waitFor(() => expect(remove).toHaveBeenCalledExactlyOnceWith('shop-1', 'ร้านทดสอบ'))
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
})
test('admin sees actionable feedback when the shop still has an open session', async () => {
  setup(vi.fn().mockRejectedValue(new Error('Close the store session before deleting this shop.')))
  fireEvent.click(await screen.findByRole('button', { name: 'ลบร้าน ร้านทดสอบ' }))
  fireEvent.change(screen.getByLabelText('พิมพ์ชื่อร้านเพื่อยืนยัน'), { target: { value: 'ร้านทดสอบ' } })
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบร้าน' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('ปิดรอบขาย')
})

test('closed shop displays status and has no close action',async()=>{
  setup()
  expect(await screen.findByText('ร้านปิด')).toBeInTheDocument()
  expect(screen.queryByRole('button',{name:'ปิดร้าน ร้านทดสอบ'})).not.toBeInTheDocument()
})
test('admin confirms closing the exact session and list refreshes',async()=>{
  const {close,list}=setup(undefined,true)
  expect(await screen.findByText('ร้านเปิด · รับออเดอร์')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'ปิดร้าน ร้านทดสอบ'}))
  expect(close).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'ยืนยันปิดรอบขาย'}))
  await waitFor(()=>expect(close).toHaveBeenCalledExactlyOnceWith('shop-1','session-1'))
  await waitFor(()=>expect(list).toHaveBeenCalledTimes(2))
})
test('pending orders offer pause without falsely marking the sales session closed',async()=>{
  const {close,pause}=setup(undefined,true)
  close.mockRejectedValue(new Error('Pending or unpaid orders must be resolved before closing the store.'))
  fireEvent.click(await screen.findByRole('button',{name:'ปิดร้าน ร้านทดสอบ'}))
  fireEvent.click(screen.getByRole('button',{name:'ยืนยันปิดรอบขาย'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('ยังมีอาหารหรือยอดรับชำระค้าง')
  fireEvent.click(screen.getByRole('button',{name:'หยุดรับออเดอร์ใหม่แทน'}))
  await waitFor(()=>expect(pause).toHaveBeenCalledExactlyOnceWith('shop-1','session-1'))
  expect(await screen.findByRole('status')).toHaveTextContent('หยุดรับออเดอร์ใหม่แล้ว')
})
