import { Link, NavLink, useLocation } from 'react-router-dom'
import logo from '../../../duckpos-logo.jpg'
import { BranchSwitcher } from './BranchSwitcher'
import { Icon, type IconName } from './Icon'

interface Props {
  owner: boolean
  member: boolean
  admin: boolean
  email?: string
  onNavigate: () => void
  onSignOut: () => void
}

export function StoreNavigation({ owner, member, admin, email, onNavigate, onSignOut }: Props) {
  const {pathname,search}=useLocation()
  const current=pathname==='/queue' ? pathname+search : pathname==='/admin'&&new URLSearchParams(search).get('view')==='shops'?'/admin?view=shops':pathname
  const icons: Record<string, IconName> = { '/': 'home', '/pos': 'bag', '/queue': 'queue', '/catalog': 'menu', '/toppings': 'toppings', '/store': 'store', '/reports': 'chart', '/settings/qr': 'qr', '/settings/shop': 'settings', '/access': 'users', '/settings/line': 'message', '/create-shop': 'plus', '/admin': 'shield' }
  icons['/attendance'] = 'clock'
  icons['/tables'] = 'store'
  icons['/admin?view=shops'] = 'users'
  const groups: { title: string; items: [string, string][] }[] = [
    { title: 'หน้าร้าน', items: member ? [['/', 'ภาพรวม'], ['/pos', 'เพิ่มออเดอร์'], ['/queue', 'ออเดอร์'], ['/queue?view=history', 'ประวัติออเดอร์'], ['/tables', 'โต๊ะและบิล'], ['/attendance', 'ลงเวลาและชั่วโมงงาน']] : [] },
    { title: 'จัดการร้าน', items: member ? [['/catalog', 'เมนูสินค้า'], ['/toppings', 'ท็อปปิง'], ['/store', 'รอบการขาย'], ...(owner ? [['/reports', 'รายงานยอดขาย'], ['/settings/qr', 'QR สั่งอาหาร']] as [string, string][] : [])] : [] },
    { title: 'ตั้งค่า', items: owner ? [['/settings/shop', 'ข้อมูลร้าน'], ['/access', 'พนักงานและสิทธิ์'], ['/settings/line', 'แจ้งเตือน LINE'], ['/create-shop', 'เพิ่มสาขา']] : [] },
    { title: 'ผู้ดูแลระบบ', items: admin ? [['/admin', 'สิทธิ์สร้างร้าน'], ['/admin?view=shops', 'ร้านค้าและพนักงาน']] : [] },
  ]
  return <div className="store-navigation">
    <NavLink to="/" className="brand-signature" onClick={onNavigate}><img src={logo} alt="" width="58" height="58" /><span>Duck<b>POS</b><small>จัดการร้านได้ง่ายขึ้น</small></span></NavLink>
    <BranchSwitcher onSwitch={onNavigate} />
    <nav aria-label="เมนูหลัก" className="navigation-groups">{groups.filter((group) => group.items.length > 0).map((group) => <section key={group.title}><h2>{group.title}</h2>{group.items.map(([to, label]) => <Link key={to} to={to} aria-current={current===to?'page':undefined} onClick={onNavigate} className={`navigation-item${current===to ? ' selected' : ''}`}><Icon name={icons[to] ?? 'menu'} /><span>{label}</span></Link>)}</section>)}</nav>
    <footer className="navigation-account"><NavLink to="/profile" onClick={onNavigate}><span className="identity-monogram">{email?.slice(0, 1).toUpperCase() ?? 'D'}</span><span><strong>{email ?? 'บัญชีของฉัน'}</strong><small>โปรไฟล์และบัญชี</small></span></NavLink><button type="button" onClick={onSignOut}>ออกจากระบบ ↗</button></footer>
  </div>
}
