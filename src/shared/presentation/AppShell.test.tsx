import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AppShell } from './AppShell'

vi.mock('../../features/auth/application/auth-context', () => ({ useAuth: () => ({ user: { email: 'qa@example.com' }, signOut: vi.fn() }) }))
vi.mock('../../features/platform-admin/application/use-platform-admin', () => ({ usePlatformAdmin: () => ({ data: false }) }))
vi.mock('../../features/shop-context/application/active-shop-context', () => ({ useActiveShop: () => ({ activeMembership: null, memberships: [] }) }))
vi.mock('./StoreNavigation', () => ({ StoreNavigation: () => <div>เนื้อหา sidebar</div> }))
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

test('sidebar closes on backdrop tap but stays open for inside interactions', () => {
  render(<MemoryRouter><AppShell><p>หน้าเว็บ</p></AppShell></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'เปิดเมนูหลัก' }))
  const dialog = screen.getByRole('dialog', { name: 'เมนูหลัก' })
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 300, top: 0, bottom: 844, width: 300, height: 844, x: 0, y: 0, toJSON() {} })
  fireEvent(dialog, new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 200 }))
  fireEvent.click(dialog, { clientX: 100, clientY: 200 })
  expect(dialog).toHaveAttribute('open')
  fireEvent(dialog, new MouseEvent('pointerdown', { bubbles: true, clientX: 350, clientY: 200 }))
  fireEvent.click(dialog, { clientX: 350, clientY: 200 })
  expect(dialog).not.toHaveAttribute('open')
})
