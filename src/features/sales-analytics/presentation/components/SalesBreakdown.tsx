import { formatThaiBaht } from '../../../catalog/domain/money'
import type { SalesDashboard } from '../../domain/sales-report'

interface Props { dashboard: SalesDashboard }

export function SalesBreakdown({ dashboard }: Props) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-line p-4">
        <h2 className="text-lg font-bold">สินค้าขายดี</h2>
        {dashboard.bestSellingProducts.length ? (
          <ol className="mt-3 space-y-3">
            {dashboard.bestSellingProducts.map((product, index) => (
              <li key={product.productId} className="flex items-center justify-between gap-3 border-b border-line pb-3">
                <div><span className="mr-2 font-black text-brand-action">{index + 1}</span><span className="font-semibold">{product.productName}</span></div>
                <div className="text-right text-sm"><p>{product.quantity.toLocaleString('th-TH')} ชิ้น</p><p className="text-muted">{formatThaiBaht(product.salesSatang)}</p></div>
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-muted">ยังไม่มีสินค้าที่ขายในช่วงนี้</p>}
      </section>
      <section className="rounded-2xl border border-line p-4">
        <h2 className="text-lg font-bold">QR เทียบกับ POS</h2>
        {dashboard.sourceSales.length ? (
          <div className="mt-3 space-y-3">
            {dashboard.sourceSales.map((source) => (
              <div key={source.source} className="rounded-xl bg-brand-soft p-3">
                <div className="flex justify-between gap-3"><strong>{source.source}</strong><strong>{formatThaiBaht(source.collectedSatang)}</strong></div>
                <p className="text-sm text-muted">{source.orderCount.toLocaleString('th-TH')} ออเดอร์ที่ชำระแล้ว</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-muted">ยังไม่มียอดรับเงินจริงในช่วงนี้</p>}
      </section>
      <section className="min-w-0 rounded-2xl border border-line p-4 lg:col-span-2">
        <h2 className="text-lg font-bold">แนวโน้มยอดขาย</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-150 text-left text-sm">
            <thead><tr className="border-b border-line"><th className="p-2">ช่วง</th><th className="p-2 text-right">ออเดอร์</th><th className="p-2 text-right">มูลค่าออเดอร์</th><th className="p-2 text-right">รับเงินจริง</th></tr></thead>
            <tbody>{dashboard.trend.map((point) => <tr key={point.period} className="border-b border-line"><td className="p-2 font-semibold">{point.period}</td><td className="p-2 text-right">{point.orderCount}</td><td className="p-2 text-right">{formatThaiBaht(point.grossOrderValueSatang)}</td><td className="p-2 text-right font-semibold text-brand-action">{formatThaiBaht(point.netCollectedSalesSatang)}</td></tr>)}</tbody>
          </table>
          {dashboard.trend.length === 0 ? <p className="p-4 text-center text-muted">ไม่มีข้อมูลในช่วงนี้</p> : null}
        </div>
      </section>
    </div>
  )
}
