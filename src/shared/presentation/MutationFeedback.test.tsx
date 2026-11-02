import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { MutationFeedback } from './MutationFeedback'

const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0 })
function Action({ run, refresh }: { run: () => Promise<void>; refresh: () => Promise<void> }) {
  const mutation = useMutation({ mutationFn: run, onSuccess: refresh })
  return <><button onClick={() => mutation.mutate()}>บันทึก</button><MutationFeedback /></>
}
test('feedback stays pending until the server write AND the subsequent refresh complete', async () => {
  let resolveRefresh!: () => void
  const refresh = vi.fn(() => new Promise<void>((resolve) => { resolveRefresh = resolve }))
  const client = new QueryClient(); clients.push(client)
  render(<QueryClientProvider client={client}><Action run={async () => {}} refresh={refresh} /></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
  expect(await screen.findByRole('status')).toHaveTextContent('กำลังทำรายการและอัปเดตข้อมูล')
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
  await act(async () => resolveRefresh())
  expect(await screen.findByText('ทำรายการสำเร็จ')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'ปิดการแจ้งผล' }))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
test('failed write reports failure without claiming success or refreshing', async () => {
  const refresh = vi.fn()
  const client = new QueryClient(); clients.push(client)
  render(<QueryClientProvider client={client}><Action run={async () => { throw new Error('network') }} refresh={refresh} /></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('ทำรายการไม่สำเร็จ')
  expect(refresh).not.toHaveBeenCalled()
  expect(screen.queryByText('ทำรายการสำเร็จ')).not.toBeInTheDocument()
})
