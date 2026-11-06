import { useRef, useState, type PropsWithChildren } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/application/auth-context'
import { usePlatformAdmin } from '../../features/platform-admin/application/use-platform-admin'
import { useActiveShop } from '../../features/shop-context/application/active-shop-context'
import { StoreNavigation } from './StoreNavigation'
import { Icon } from './Icon'
import { MobileNavigation } from './MobileNavigation'
import { SignOutConfirmation } from './SignOutConfirmation'

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const menu = useRef<HTMLDialogElement>(null)
  const backdropPressed = useRef(false)
  const [confirmSignOut,setConfirmSignOut] = useState(false)
  const { signOut, user } = useAuth()
  const { activeMembership, memberships } = useActiveShop()
  const { data: isPlatformAdmin = false } = usePlatformAdmin()
  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }
  const navigation = <StoreNavigation owner={activeMembership?.role === 'OWNER'} member={memberships.length > 0} admin={isPlatformAdmin} email={user?.email} onNavigate={() => menu.current?.close()} onSignOut={() => {menu.current?.close();setConfirmSignOut(true)}} />
  return <div className={`release-layout${activeMembership ? ' has-mobile-navigation' : ''}`}>
    <a className="skip-content" href="#workspace">ข้ามไปยังเนื้อหา</a>
    <aside className="release-sidebar">{navigation}</aside>
    <dialog ref={menu} className="release-drawer" aria-label="เมนูหลัก"
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        backdropPressed.current = event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)
      }}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
        if (backdropPressed.current && event.target === event.currentTarget && outside) menu.current?.close()
        backdropPressed.current = false
      }}><button autoFocus type="button" className="drawer-dismiss" onClick={() => menu.current?.close()}><Icon name="close" /> ปิดเมนู</button>{navigation}</dialog>
    <div className="release-workspace">
      <header className="workspace-toolbar"><button type="button" aria-label="เปิดเมนูหลัก" aria-haspopup="dialog" className="drawer-trigger" onClick={() => menu.current?.showModal()}><Icon name="bars" /></button><span className="toolbar-store-icon"><Icon name="store" /></span><div className="workspace-shop"><span>พื้นที่จัดการร้าน</span><strong>{activeMembership?.shops?.name ?? 'DuckPOS'}</strong></div><span className="role-badge">{activeMembership?.role === 'OWNER' ? 'เจ้าของร้าน' : activeMembership ? 'พนักงาน' : 'บัญชีของฉัน'}</span></header>
      {confirmSignOut&&<SignOutConfirmation email={user?.email} onConfirm={handleSignOut} onCancel={()=>setConfirmSignOut(false)}/>}
      <div id="workspace" tabIndex={-1} className="release-content">{children}</div>
      {activeMembership && <MobileNavigation />}
    </div>
  </div>
}
