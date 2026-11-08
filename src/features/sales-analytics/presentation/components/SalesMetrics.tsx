import { formatThaiBaht } from '../../../catalog/domain/money'
import type { SalesDashboard } from '../../domain/sales-report'

interface Props { dashboard: SalesDashboard }

export function SalesMetrics({ dashboard }: Props) {
  const cards = [
    ['ยอดรับเงินจริง', formatThaiBaht(dashboard.netCollectedSalesSatang), 'text-brand-action'],
    ['มูลค่าออเดอร์รวม', formatThaiBaht(dashboard.grossOrderValueSatang), 'text-ink'],
    ['เงินสด', formatThaiBaht(dashboard.cashSalesSatang), 'text-ink'],
    ['เงินโอน', formatThaiBaht(dashboard.transferSalesSatang), 'text-ink'],
    ['ออเดอร์จ่ายแล้ว', dashboard.paidOrders.toLocaleString('th-TH'), 'text-green-700'],
    ['ออเดอร์ยังไม่จ่าย', dashboard.unpaidOrders.toLocaleString('th-TH'), 'text-amber-700'],
    ['ออเดอร์ยกเลิก', dashboard.cancelledOrders.toLocaleString('th-TH'), 'text-red-700'],
    ['สินค้าที่ขาย', dashboard.productsSold.toLocaleString('th-TH'), 'text-ink'],
    ['เฉลี่ยต่อออเดอร์', formatThaiBaht(dashboard.averageOrderValueSatang), 'text-ink'],
  ]
  return <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value, color],index) => <article key={label} className={`pos-metric ${index===0?'col-span-full p-5':''}`}><p className="text-sm font-semibold text-muted">{label}</p><p className={`mt-1 break-words font-black ${index===0?'text-4xl':'text-lg sm:text-2xl'} ${color}`}>{value}</p></article>)}</section>
}
