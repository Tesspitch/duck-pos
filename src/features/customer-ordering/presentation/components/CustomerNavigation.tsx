import { Icon } from '../../../../shared/presentation/Icon'
import { Link } from 'react-router-dom'

interface Props {
  active: 'menu' | 'cart' | 'tracking'
  quantity?: number
  busy?: boolean
  onMenu: () => void
  onCart?: () => void
  trackingPath?: string
}

export function CustomerNavigation({ active, quantity = 0, busy = false, onMenu, onCart, trackingPath }: Props) {
  return <nav className="customer-bottom-navigation" aria-label="เมนูลูกค้า">
    <button type="button" disabled={busy} aria-current={active === 'menu' ? 'page' : undefined} onClick={onMenu}>
      <Icon name="menu" size={22} /><span>เมนู</span>
    </button>
    {onCart && <button type="button" disabled={busy || quantity === 0} aria-current={active === 'cart' ? 'page' : undefined}
      aria-haspopup="dialog" aria-expanded={active === 'cart'} onClick={onCart}>
      <span className="customer-nav-icon"><Icon name="bag" size={22} />{quantity > 0 && <span className="customer-nav-count">{quantity}</span>}</span><span>ตะกร้า</span>
    </button>}
    {trackingPath && (busy
      ? <button type="button" disabled><Icon name="clock" size={22} /><span>สถานะออเดอร์</span></button>
      : <Link to={trackingPath} aria-current={active === 'tracking' ? 'page' : undefined}><Icon name="clock" size={22} /><span>สถานะออเดอร์</span></Link>)}
  </nav>
}
