import { useRef, useState, type PropsWithChildren } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/application/auth-context'
import { usePlatformAdmin } from '../../features/platform-admin/application/use-platform-admin'
import { useActiveShop } from '../../features/shop-context/application/active-shop-context'
import { StoreNavigation } from './StoreNavigation'
import { Icon } from './Icon'
import { MobileNavigation } from './MobileNavigation'

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const menu = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const { signOut, user } = useAuth()
  const { activeMembership, memberships } = useActiveShop()
  const { data: isPlatformAdmin = false } = usePlatformAdmin()
  async function handleSignOut() {
    try { await signOut(); navigate('/login', { replace: true }) }
    catch { setError('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง') }
  }
  const navigation = <StoreNavigation owner={activeMembership?.role === 'OWNER'} member={memberships.length > 0} admin={isPlatformAdmin} email={user?.email} onNavigate={() => menu.current?.close()} onSignOut={() => void handleSignOut()} />
  return <div className={`release-layout${activeMembership ? ' has-mobile-navigation' : ''}`}>
    <a className="skip-content" href="#workspace">ข้ามไปยังเนื้อหา</a>
    <aside className="release-sidebar">{navigation}</aside>
    <dialog ref={menu} className="release-drawer" aria-label="เมนูหลัก"><button autoFocus type="button" className="drawer-dismiss" onClick={() => menu.current?.close()}><Icon name="close" /> ปิดเมนู</button>{navigation}</dialog>
    <div className="release-workspace">
      <header className="workspace-toolbar"><button type="button" aria-label="เปิดเมนูหลัก" aria-haspopup="dialog" className="drawer-trigger" onClick={() => menu.current?.showModal()}><Icon name="bars" /></button><span className="toolbar-store-icon"><Icon name="store" /></span><div className="workspace-shop"><span>พื้นที่จัดการร้าน</span><strong>{activeMembership?.shops?.name ?? 'DuckPOS'}</strong></div><span className="role-badge">{activeMembership?.role === 'OWNER' ? 'เจ้าของร้าน' : activeMembership ? 'พนักงาน' : 'บัญชีของฉัน'}</span></header>
      {error && <p role="alert" className="m-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      <div id="workspace" tabIndex={-1} className="release-content">{children}</div>
      {activeMembership && <MobileNavigation />}
    </div>
  </div>
}
