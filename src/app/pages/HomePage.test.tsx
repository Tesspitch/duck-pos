import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'
import type { PropsWithChildren } from 'react'

const context = vi.hoisted(() => ({
  activeMembership: { shop_id: 'a', role: 'OWNER', shops: { name: 'A' } },
  openStore: vi.fn(),
}))
vi.mock('../../features/shop-context/application/active-shop-context', () => ({
  useActiveShop: () => context,
}))
vi.mock('../../shared/presentation/AppShell', () => ({
  AppShell: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))
vi.mock('../../features/store-management/presentation/components/HomeStoreControl', () => ({
  HomeStoreControl: ({ shopId }: { shopId: string }) => <button onClick={() => context.openStore(shopId)}>เปิดร้าน</button>,
}))
vi.mock('./HomeActivity', () => ({
  HomeActivity: ({ shopId }: { shopId: string }) => <p>ยอดขาย {shopId}</p>,
}))
vi.mock('../../features/attendance/presentation/AttendanceClockCard', () => ({
  AttendanceClockCard: () => <button>ลงเวลาเข้างาน</button>,
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })

test('switching branches repeatedly keeps one store control targeting only the selected shop', () => {
  const { rerender } = render(<MemoryRouter><HomePage /></MemoryRouter>)
  for (const shopId of ['b', 'a', 'b', 'c', 'a']) {
    context.activeMembership = { shop_id: shopId, role: 'OWNER', shops: { name: shopId } }
    rerender(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getAllByRole('button', { name: 'เปิดร้าน' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'ลงเวลาเข้างาน' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'เปิดร้าน' }))
    expect(context.openStore).toHaveBeenLastCalledWith(shopId)
  }
})
