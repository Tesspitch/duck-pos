import { formatThaiBaht } from '../../../catalog/domain/money'
import type { SalesHistoryPage } from '../../domain/sales-report'

interface Props {
  page: SalesHistoryPage
  isFetching: boolean
  onPageChange: (page: number) => void
}

const dateTime = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

export function SalesHistoryTable({ page, isFetching, onPageChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(page.totalCount / page.pageSize))
  return (
    <section className="mt-5 min-w-0 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-xl font-bold">ประวัติการขาย</h2><p className="text-sm text-muted">พบ {page.totalCount.toLocaleString('th-TH')} รายการ {isFetching ? '· กำลังอัปเดต…' : ''}</p></div>
        <p className="text-sm font-semibold">หน้า {page.page}/{pageCount}</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-230 text-left text-sm">
          <thead><tr className="border-b border-line"><th className="p-2">วัน/เวลา</th><th className="p-2">อ้างอิง/คิว</th><th className="p-2">สินค้า</th><th className="p-2">ช่องทาง</th><th className="p-2">สถานะ</th><th className="p-2">ชำระเงิน</th><th className="p-2 text-right">ยอด</th></tr></thead>
          <tbody>{page.items.map((order) => (
            <tr key={order.id} className="border-b border-line align-top">
              <td className="p-2"><p className="font-semibold">{order.businessDate}</p><p className="text-muted">{dateTime(order.createdAt)}</p></td>
              <td className="p-2"><p className="font-semibold">{order.orderReference}</p><p className="text-muted">คิว {order.queueNumber}</p></td>
              <td className="p-2">{order.products.map((product) => <p key={`${product.name}-${product.quantity}`}>{product.name} × {product.quantity}</p>)}</td>
              <td className="p-2 font-semibold">{order.source}</td><td className="p-2">{order.orderStatus}</td>
              <td className="p-2"><p>{order.paymentStatus}</p><p className="text-muted">{order.paymentMethod === 'CASH' ? 'เงินสด' : order.paymentMethod === 'BANK_TRANSFER' ? 'เงินโอน' : '—'}</p></td>
              <td className="p-2 text-right font-bold">{formatThaiBaht(order.totalSatang)}</td>
            </tr>
          ))}</tbody>
        </table>
        {page.items.length === 0 ? <p className="p-8 text-center text-muted">ไม่พบรายการตามตัวกรอง</p> : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button type="button" disabled={page.page <= 1} onClick={() => onPageChange(page.page - 1)} className="rounded-lg border border-line px-4 disabled:opacity-40">ก่อนหน้า</button>
        <button type="button" disabled={page.page >= pageCount} onClick={() => onPageChange(page.page + 1)} className="rounded-lg border border-line px-4 disabled:opacity-40">ถัดไป</button>
      </div>
    </section>
  )
}
