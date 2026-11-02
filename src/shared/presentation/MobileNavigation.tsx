import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'ภาพรวม', icon: 'home' },
  { to: '/pos', label: 'รับออเดอร์', icon: 'bag' },
  { to: '/queue', label: 'คิว', icon: 'queue' },
  { to: '/catalog', label: 'เมนูสินค้า', icon: 'menu' },
]

export function MobileNavigation() {
  return <nav className="mobile-bottom-navigation" aria-label="เมนูด่วนหน้าร้าน">
    {links.map(({ to, label, icon }) => <NavLink key={to} to={to} end className={({ isActive }) => `mobile-bottom-link${isActive ? ' is-active' : ''}`}><Icon name={icon} size={22} /><span>{label}</span></NavLink>)}
  </nav>
}
