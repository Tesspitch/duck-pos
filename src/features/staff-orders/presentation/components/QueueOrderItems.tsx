import { Icon } from '../../../../shared/presentation/Icon'
import type { StaffOrderItem } from '../../domain/staff-order'

export function QueueOrderItems({ items }: { items: StaffOrderItem[] }) {
  return <ul className="queue-ticket-items" aria-label="รายการอาหาร">
    {items.map((item) => <li key={item.id} className="queue-ticket-item">
      <div className="queue-item-title">
        <span className="queue-item-quantity" aria-label={`จำนวน ${item.quantity} ชิ้น`}>{item.quantity}×</span>
        <h3>{item.name}</h3>
        <span className="queue-item-price">฿{(item.lineTotalSatang / 100).toFixed(2)}</span>
      </div>
      {item.options.length > 0 && <div className="queue-item-options" aria-label={`ตัวเลือก ${item.name}`}>
        {item.options.map((option, index) => <span key={`${index}-${option}`}>{option}</span>)}
      </div>}
      {item.note && <div className="queue-item-note"><Icon name="message" size={18} /><div><strong>หมายเหตุอาหาร</strong><p>{item.note}</p></div></div>}
    </li>)}
  </ul>
}
