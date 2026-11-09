import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AppShell } from './AppShell'
import systemLogo from '../../assets/duckpos-logo-480.jpg'
import type { Membership } from '../../features/access-control/domain/membership'

const signOut=vi.hoisted(()=>vi.fn().mockResolvedValue(undefined))
const activeShop = vi.hoisted(() => ({ activeMembership: null as Membership | null }))
vi.mock('../../features/auth/application/auth-context', () => ({ useAuth: () => ({ user: { email: 'qa@example.com' }, signOut }) }))
vi.mock('../../features/platform-admin/application/use-platform-admin', () => ({ usePlatformAdmin: () => ({ data: false }) }))
vi.mock('../../features/shop-context/application/active-shop-context', () => ({ useActiveShop: () => ({ ...activeShop, memberships: [] }) }))
vi.mock('../../features/dining/presentation/StaffServiceRequests', () => ({ StaffServiceRequests: () => null }))
vi.mock('./StoreNavigation', () => ({ StoreNavigation: ({onSignOut}:{onSignOut:()=>void}) => <div>เนื้อหา sidebar<button onClick={onSignOut}>ออกจากระบบ</button></div> }))
beforeEach(() => {
  activeShop.activeMembership = null
  signOut.mockReset().mockResolvedValue(undefined)
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})

test('toolbar uses the current shop logo and falls back when absent or broken', () => {
  const shopLogo = 'https://example.com/shop-logo.webp'
  const membership: Membership = {
    id: 'member', shop_id: 'first', user_id: 'user', role: 'STAFF',
    status: 'ACTIVE', granted_at: '', revoked_at: null,
    shops: { id: 'first', name: 'สาขาแรก', logoUrl: shopLogo },
  }
  activeShop.activeMembership = membership
  const shell = <MemoryRouter><AppShell><p>หน้าเว็บ</p></AppShell></MemoryRouter>
  const { rerender } = render(shell)
  const toolbar = screen.getByRole('banner')
  const logo = () => toolbar.querySelector('img')!
  expect(logo()).toHaveAttribute('src', shopLogo)
  fireEvent.error(logo())
  expect(logo()).toHaveAttribute('src', systemLogo)

  activeShop.activeMembership = { ...membership, shop_id: 'second', shops: { id: 'second', name: 'สาขาสอง' } }
  rerender(<MemoryRouter><AppShell><p>หน้าเว็บ</p></AppShell></MemoryRouter>)
  expect(toolbar).toHaveTextContent('สาขาสอง')
  expect(logo()).toHaveAttribute('src', systemLogo)
})

test('sign out asks confirmation and cancel preserves login',()=>{
 render(<MemoryRouter><AppShell><p>หน้าเว็บ</p></AppShell></MemoryRouter>)
 fireEvent.click(screen.getAllByRole('button',{name:'ออกจากระบบ'})[0]!)
 expect(screen.getByRole('dialog',{name:'ออกจากระบบ?'})).toBeVisible()
 expect(signOut).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'อยู่ต่อ'}))
 expect(screen.queryByRole('dialog',{name:'ออกจากระบบ?'})).not.toBeInTheDocument()
 expect(signOut).not.toHaveBeenCalled()
})
test('confirmed sign out only submits once while request is pending',async()=>{
 let finish!:()=>void
 signOut.mockReturnValue(new Promise<void>(resolve=>{finish=resolve}))
 render(<MemoryRouter><AppShell><p>หน้าเว็บ</p></AppShell></MemoryRouter>)
 fireEvent.click(screen.getAllByRole('button',{name:'ออกจากระบบ'})[0]!)
 fireEvent.click(screen.getByRole('button',{name:'ยืนยัน'}))
 expect(screen.getByRole('button',{name:'อยู่ต่อ'})).toBeDisabled()
 expect(screen.getByRole('button',{name:'กำลังออก…'})).toBeDisabled()
 expect(signOut).toHaveBeenCalledTimes(1)
 finish()
 await waitFor(()=>expect(screen.queryByRole('button',{name:'กำลังออก…'})).not.toBeInTheDocument())
})
test('failed sign out keeps confirmation open with retry feedback',async()=>{
 signOut.mockRejectedValue(new Error('network'))
 render(<MemoryRouter><AppShell><p>หน้าเว็บ</p></AppShell></MemoryRouter>)
 fireEvent.click(screen.getAllByRole('button',{name:'ออกจากระบบ'})[0]!)
 fireEvent.click(screen.getByRole('button',{name:'ยืนยัน'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('ออกจากระบบไม่สำเร็จ')
 expect(screen.getByRole('button',{name:'ยืนยัน'})).toBeEnabled()
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
