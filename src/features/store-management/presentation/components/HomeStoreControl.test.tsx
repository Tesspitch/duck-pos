import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { StoreManagementProvider } from '../../application/StoreManagementProvider'
import { HomeStoreControl } from './HomeStoreControl'

const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0 })

function setup(acceptingOrders: boolean, pendingOrderCount: number) {
  const setAcceptingOrders = vi.fn().mockResolvedValue(undefined)
  const repository = {
    get: vi.fn().mockResolvedValue({ isOpen: true, acceptingOrders, activeSession: { id: 'session', businessDate: '2026-11-03', openedAt: '2026-11-03T00:00:00Z', acceptingOrders, pendingOrderCount }, history: [] }),
    open: vi.fn(), close: vi.fn(), setAcceptingOrders,
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); clients.push(client)
  render(<MemoryRouter><QueryClientProvider client={client}><StoreManagementProvider repository={repository} realtime={{ subscribe: () => () => undefined }}><HomeStoreControl shopId="shop" /></StoreManagementProvider></QueryClientProvider></MemoryRouter>)
  return { setAcceptingOrders }
}

test('paused intake keeps the existing queue visible and lets staff resume accepting orders', async () => {
  const { setAcceptingOrders } = setup(false, 2)
  const resume = await screen.findByRole('button', { name: 'เปิดรับอีกครั้ง' })
  expect(screen.getByText('หยุดรับชั่วคราว')).toBeInTheDocument()
  expect(screen.getByText(/เคลียร์รายการเดิมต่อจนเสร็จ/)).toBeInTheDocument()
  fireEvent.click(resume)
  await waitFor(() => expect(setAcceptingOrders).toHaveBeenCalledWith('shop', 'session', true))
})

test('accepting store offers a distinct stop-intake action while unresolved orders block closing', async () => {
  setup(true, 1)
  expect(await screen.findByRole('button', { name: 'หยุดรับชั่วคราว' })).toBeInTheDocument()
  expect(screen.queryByLabelText('ยืนยันปิดรอบขาย')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'ไปจัดการคิว →' })).toHaveAttribute('href', '/queue')
})
