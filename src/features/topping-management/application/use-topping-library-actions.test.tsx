import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { ToppingLibraryContext } from './topping-library-context'
import { useToppingLibrary } from './use-topping-library'
import { useToppingLibraryActions } from './use-topping-library-actions'
import type { ToppingLibraryRepository } from './topping-library-repository'

const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0 })
function Harness() {
  const library = useToppingLibrary('shop')
  const actions = useToppingLibraryActions('shop')
  useQuery({ queryKey: ['catalog', 'shop'], queryFn: async () => [] })
  useQuery({ queryKey: ['public-menu', 'shop'], queryFn: async () => null })
  return <><p>{library.data?.categories[0]?.name}</p>
    <button onClick={() => actions.saveTopping.mutate({ shopId: 'shop', groupId: 'g', name: 'ใหม่', priceDeltaSatang: 0, isVisible: true, isAvailable: true })}>เพิ่ม</button>
    <button onClick={() => actions.setAvailability.mutate({ toppingId: 't', available: false })}>ปิดขาย</button>
    <button onClick={() => actions.deleteTopping.mutate('t')}>ลบ</button>
  </>
}
test.each(['เพิ่ม', 'ปิดขาย', 'ลบ'])('%s refreshes library, POS catalog and public menu automatically', async (action) => {
  let version = 'ก่อนทำรายการ'
  const update = async () => { version = 'ข้อมูลล่าสุด'; return 'saved' }
  const repository: ToppingLibraryRepository = { get: vi.fn(async () => ({ categories: [{ id: 'c', name: version }], groups: [] })), saveTopping: update, saveGroup: update, deleteGroup: async () => { await update() }, deleteTopping: async () => { await update() }, setToppingAvailability: async () => { await update() } }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client)
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><ToppingLibraryContext value={repository}><Harness /></ToppingLibraryContext></QueryClientProvider>)
  await screen.findByText('ก่อนทำรายการ')
  fireEvent.click(screen.getByRole('button', { name: action }))
  await screen.findByText('ข้อมูลล่าสุด')
  await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3))
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'shop'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['public-menu', 'shop'] })
})
