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
  return <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value, color]) => <article key={label} className="rounded-2xl border border-line bg-white p-4"><p className="text-sm font-semibold text-muted">{label}</p><p className={`mt-1 text-2xl font-black ${color}`}>{value}</p></article>)}</section>
}
