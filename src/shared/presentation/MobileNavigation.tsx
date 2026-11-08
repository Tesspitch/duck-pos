import { Link, useLocation } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'ภาพรวม', icon: 'home' },
  { to: '/queue', label: 'ออเดอร์', icon: 'queue' },
  { to: '/pos', label: 'เพิ่มออเดอร์', icon: 'plus' },
]

export function MobileNavigation({onMore}:{onMore:()=>void}) {
  const {pathname,search}=useLocation()
  const current=pathname==='/queue'&&new URLSearchParams(search).has('view')?pathname+search:pathname
  return <nav className="mobile-bottom-navigation" aria-label="เมนูด่วนหน้าร้าน">
    {links.map(({to,label,icon})=><Link key={to} to={to} aria-current={current===to?'page':undefined} className={`mobile-bottom-link${current===to?' is-active':''}`}><Icon name={icon} size={22}/><span>{label}</span></Link>)}
    <button type="button" aria-haspopup="dialog" className={`mobile-bottom-link${links.some(link=>link.to===current)?'':' is-active'}`} onClick={onMore}><Icon name="bars" size={22}/><span>เพิ่มเติม</span></button>
  </nav>
}
