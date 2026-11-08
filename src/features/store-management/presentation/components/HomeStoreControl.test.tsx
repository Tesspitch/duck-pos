import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { StoreManagementProvider } from '../../application/StoreManagementProvider'
import { HomeStoreControl } from './HomeStoreControl'

const clients: QueryClient[] = []
beforeEach(()=>{
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
})
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0 })

function setup(acceptingOrders: boolean, pendingOrderCount: number, isOpen = true) {
  const setAcceptingOrders = vi.fn().mockResolvedValue(undefined)
  const repository = {
    get: vi.fn().mockResolvedValue({ isOpen, acceptingOrders, activeSession: isOpen ? { id: 'session', businessDate: '2026-11-03', openedAt: '2026-11-03T00:00:00Z', acceptingOrders, pendingOrderCount } : null, history: [] }),
    open: vi.fn().mockResolvedValue(undefined), close: vi.fn(), setAcceptingOrders,
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); clients.push(client)
  render(<MemoryRouter><QueryClientProvider client={client}><StoreManagementProvider repository={repository} realtime={{ subscribe: () => () => undefined }}><HomeStoreControl shopId="shop" /></StoreManagementProvider></QueryClientProvider></MemoryRouter>)
  return repository
}

test('opening the store requires confirmation and can be cancelled', async () => {
  const { open } = setup(false, 0, false)
  const trigger = await screen.findByRole('button', { name: 'เปิดร้าน' })
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
  expect(open).not.toHaveBeenCalled()
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
  await waitFor(() => expect(open).toHaveBeenCalledWith('shop'))
})

test('paused intake keeps the existing queue visible and lets staff resume accepting orders', async () => {
  const { setAcceptingOrders } = setup(false, 2)
  const resume = await screen.findByRole('button', { name: 'เปิดรับอีกครั้ง' })
  expect(screen.getByText('พักรับออเดอร์อยู่')).toBeInTheDocument()
  expect(screen.getByText(/เคลียร์รายการเดิมต่อจนเสร็จ/)).toBeInTheDocument()
  fireEvent.click(resume)
  expect(setAcceptingOrders).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
  await waitFor(() => expect(setAcceptingOrders).toHaveBeenCalledWith('shop', 'session', true))
})

test('accepting store offers a distinct stop-intake action while unresolved orders block closing', async () => {
  const { setAcceptingOrders } = setup(true, 1)
  fireEvent.click(await screen.findByRole('button', { name: 'พักรับออเดอร์' }))
  expect(screen.queryByRole('button', { name: 'ปิดร้าน' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'ไปจัดการคิว →' })).toHaveAttribute('href', '/queue')
  expect(setAcceptingOrders).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
  await waitFor(() => expect(setAcceptingOrders).toHaveBeenCalledWith('shop', 'session', false))
})
