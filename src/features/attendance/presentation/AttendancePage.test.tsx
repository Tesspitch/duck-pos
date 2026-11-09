import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../auth/application/auth-context'
import { AttendanceContext, AttendanceLocationContext, type AttendanceRepository } from '../application/attendance-context'
import { AttendanceWorkspace } from './AttendancePage'
import { AttendanceClockCard } from './AttendanceClockCard'
import type { User } from '@supabase/supabase-js'

const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.forEach((c) => c.clear()); clients.length = 0 })
const position = { latitude: 16, longitude: 103, accuracyM: 10, capturedAt: '2026-11-05T03:00:00Z' }
function setup(active = false, capture = vi.fn().mockResolvedValue(position), compact = false) {
  let entered = active
  const repository: AttendanceRepository = {
    getMine: vi.fn(async () => ({ activeEntry: entered ? { id: 'shift', shopId: 'other', shopName: 'สาขาเดิม', clockedInAt: '2026-11-05T02:00:00Z' } : null, serverTime: '2026-11-05T03:00:00Z' })),
    getPersonal: vi.fn(async () => ({
      todaySeconds: 1800,
      recent: [{ id: 'recent', clockedInAt: '2026-11-04T02:00:00Z', clockedOutAt: '2026-11-04T10:15:00Z' }],
    })),
    clockIn: vi.fn(async () => { entered = true }),
    clockOut: vi.fn(async () => { entered = false }),
    getReport: vi.fn(async () => ({ timezone: 'Asia/Bangkok', serverTime: '2026-11-05T03:00:00Z', totalSeconds: 14400, totalShifts: 1, activeShifts: 0, totalCount: 1, page: 1, pageSize: 50, rows: [{ period: '2026-11-01', userId: 'employee', employeeName: 'พนักงานทดสอบ', seconds: 14400, shifts: 1, isLive: false, firstIn: '2026-11-01T01:00:00Z', lastOut: '2026-11-01T05:00:00Z' }] })),
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); clients.push(client)
  render(<MemoryRouter><QueryClientProvider client={client}><AuthContext value={{ loading: false, session: null, user: { id: 'me' } as User, signInWithGoogle: vi.fn(), signOut: vi.fn() }}><AttendanceContext value={repository}><AttendanceLocationContext value={{ capture }}>{compact
    ? <AttendanceClockCard shopId="shop" shopName="สาขาทดสอบ" compact />
    : <AttendanceWorkspace shopId="shop" owner />}</AttendanceLocationContext></AttendanceContext></AuthContext></QueryClientProvider></MemoryRouter>)
  return { ...repository, capture }
}
test('clock-in captures a fresh location only after confirmation and refreshes attendance', async () => {
  const repository = setup()
  fireEvent.click(await screen.findByRole('button', { name: 'ลงเวลาเข้างาน' }))
  expect(repository.clockIn).not.toHaveBeenCalled()
  expect(repository.capture).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
  await screen.findByText('ลงเวลาเข้างานแล้ว')
  expect(repository.clockIn).toHaveBeenCalledWith('shop', position)
  expect(await screen.findByRole('button', { name: 'ลงเวลาออกงาน' })).toBeInTheDocument()
})
test('overview clocks in at the selected branch without fetching reports or history', async () => {
  const repository = setup(false, vi.fn().mockResolvedValue(position), true)
  fireEvent.click(await screen.findByRole('button', { name: 'ลงเวลาเข้างาน' }))
  expect(screen.getByText('ยืนยันเข้างาน · สาขาทดสอบ')).toBeVisible()
  expect(repository.capture).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
  await screen.findByText('ลงเวลาเข้างานแล้ว')
  expect(repository.clockIn).toHaveBeenCalledWith('shop', position)
  expect(repository.getReport).not.toHaveBeenCalled()
  expect(repository.getPersonal).not.toHaveBeenCalled()
})
test('today shows personal hours separately from the owner report and recent shift duration', async () => {
  setup()
  expect(await screen.findByText('0 ชม. 30 นาที')).toBeVisible()
  expect(screen.getByText('8 ชม. 15 นาที')).toBeVisible()
  expect(await screen.findByRole('region', { name: 'สรุปชั่วโมงงาน' })).toHaveTextContent('4 ชม. 0 นาที')
})
test('clock-out uses the active entry even if it belongs to another branch', async () => {
  const repository = setup(true)
  fireEvent.click(await screen.findByRole('button', { name: 'ลงเวลาออกงาน' }))
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
  await screen.findByText('ลงเวลาออกงานแล้ว')
  expect(repository.clockOut).toHaveBeenCalledWith('shift')
  expect(repository.capture).not.toHaveBeenCalled()
})
test('location permission denial prevents clock-in and displays a retryable error', async () => {
  const repository = setup(false, vi.fn().mockRejectedValue(new Error('กรุณาอนุญาตเข้าถึงตำแหน่งเพื่อเข้างาน')))
  fireEvent.click(await screen.findByRole('button', { name: 'ลงเวลาเข้างาน' }))
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('กรุณาอนุญาตเข้าถึงตำแหน่ง')
  expect(repository.clockIn).not.toHaveBeenCalled()
})
test('changing summary bucket applies the requested date range and resets the page', async () => {
  const repository = setup()
  await screen.findByText('พนักงานทดสอบ')
  fireEvent.change(screen.getByLabelText('ตั้งแต่วันที่'), { target: { value: '2026-10-01' } })
  fireEvent.change(screen.getByLabelText('ถึงวันที่'), { target: { value: '2026-11-01' } })
  fireEvent.change(screen.getByLabelText('สรุปตาม'), { target: { value: 'WEEK' } })
  fireEvent.click(screen.getByRole('button', { name: 'ดูรายงาน' }))
  await waitFor(() => expect(repository.getReport).toHaveBeenCalledWith('shop', expect.objectContaining({ dateFrom: '2026-10-01', dateTo: '2026-11-01', bucket: 'WEEK', page: 1 })))
})
test('invalid date range does not request another report', async () => {
  const repository = setup()
  await screen.findByText('พนักงานทดสอบ')
  const calls = vi.mocked(repository.getReport).mock.calls.length
  fireEvent.change(screen.getByLabelText('ตั้งแต่วันที่'), { target: { value: '2027-12-31' } })
  fireEvent.change(screen.getByLabelText('ถึงวันที่'), { target: { value: '2026-01-01' } })
  fireEvent.click(screen.getByRole('button', { name: 'ดูรายงาน' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด')
  expect(vi.mocked(repository.getReport).mock.calls.length).toBe(calls)
})
