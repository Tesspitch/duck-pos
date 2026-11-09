import { useState } from 'react'
import { formatThaiBaht } from '../../../catalog/domain/money'
import type { SalesHistoryItem, SalesHistoryPage } from '../../domain/sales-report'
import { OrderHistoryDeletionControl } from '../../../history-management/presentation/OrderHistoryDeletionControl'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'

interface Props {
  page: SalesHistoryPage
  isFetching: boolean
  onPageChange: (page: number) => void
}

const formatter = new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' })
const dateTime = (value: string) => formatter.format(new Date(value))
const orderLabels = { QUEUED:'รอทำ', PREPARING:'กำลังทำ', READY:'พร้อมรับ', COMPLETED:'เสร็จแล้ว', CANCELLED:'ยกเลิก' }
const paymentLabels = { UNPAID:'ยังไม่ชำระ', PAID:'ชำระแล้ว', REFUNDED:'คืนเงินแล้ว' }
const methodLabel = (method: SalesHistoryItem['paymentMethod']) => method==='CASH'?'เงินสด':method==='BANK_TRANSFER'?'เงินโอน':'—'
const sourceLabel = (source: SalesHistoryItem['source']) => source==='QR'?'สั่งผ่าน QR':'หน้าร้าน'

function StatusBadge({order}:{order:SalesHistoryItem}) {
  const cancelled=order.orderStatus==='CANCELLED'
  const tone=cancelled?'bg-red-50 text-red-800':order.paymentStatus==='PAID'?'bg-green-50 text-green-800':'bg-amber-50 text-amber-900'
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{cancelled?'ยกเลิก':paymentLabels[order.paymentStatus]}</span>
}

export function SalesHistoryTable({ page, isFetching, onPageChange }: Props) {
  const { activeMembership } = useActiveShop()
  const [selected,setSelected]=useState<SalesHistoryItem|null>(null)
  const shopId = activeMembership?.shop_id ?? ''
  const shopName = activeMembership?.shops?.name ?? ''
  const pageCount = Math.max(1, Math.ceil(page.totalCount / page.pageSize))
  const start = (page.page-1)*page.pageSize
  return <section className="sales-history-panel min-w-0 rounded-2xl border border-line bg-white">
    <header className="flex flex-wrap items-center justify-between gap-2 p-4"><h2 className="text-lg font-bold">ประวัติการขาย</h2>{isFetching&&<p role="status" className="text-xs text-muted">กำลังอัปเดต…</p>}</header>
    <table className="sales-history-table w-full text-left text-sm">
      <thead><tr><th scope="col">คิว</th><th scope="col">วันที่และเวลา</th><th scope="col">เลขอ้างอิง</th><th scope="col">ช่องทาง</th><th scope="col" className="text-right">ชิ้น</th><th scope="col" className="text-right">ยอดออเดอร์</th><th scope="col">วิธีชำระ</th><th scope="col">สถานะ</th><th scope="col">จัดการ</th></tr></thead>
      <tbody>{page.items.map(order=><tr key={order.id}>
        <td data-label="คิว"><strong className="tabular-nums">{String(order.queueNumber).padStart(3,'0')}</strong></td>
        <td data-label="วันที่และเวลา">{dateTime(order.createdAt)}</td>
        <td data-label="เลขอ้างอิง" className="break-all font-semibold">{order.orderReference}</td>
        <td data-label="ช่องทาง">{sourceLabel(order.source)}</td>
        <td data-label="จำนวนชิ้น" className="text-right">{order.products.reduce((sum,product)=>sum+product.quantity,0)}</td>
        <td data-label="ยอดออเดอร์" className="text-right font-bold tabular-nums">{formatThaiBaht(order.totalSatang)}</td>
        <td data-label="วิธีชำระ">{methodLabel(order.paymentMethod)}</td>
        <td data-label="สถานะ"><StatusBadge order={order}/></td>
        <td><div className="flex flex-wrap items-center gap-2"><button type="button" className="min-h-11 font-semibold text-brand-action" onClick={()=>setSelected(order)} aria-label={`รายละเอียด ${order.orderReference}`}>รายละเอียด</button>{activeMembership?.role==='OWNER'&&<OrderHistoryDeletionControl shopId={shopId} shopName={shopName} orderId={order.id} orderReference={order.orderReference}/>}</div></td>
      </tr>)}</tbody>
    </table>
    {page.items.length===0&&<p className="p-8 text-center text-muted">ไม่พบรายการตามตัวกรอง</p>}
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-4">
      <p className="text-sm text-muted">{page.items.length?`แสดง ${start+1}–${start+page.items.length} จาก ${page.totalCount} รายการ`:`ทั้งหมด ${page.totalCount} รายการ`}</p>
      <div className="pos-chips items-center"><button type="button" disabled={isFetching||page.page<=1} onClick={()=>onPageChange(page.page-1)}>ก่อนหน้า</button><span className="px-1 text-sm font-bold">{page.page}/{pageCount}</span><button type="button" disabled={isFetching||page.page>=pageCount} onClick={()=>onPageChange(page.page+1)}>ถัดไป</button></div>
    </footer>
    {selected&&<FormWorkspace title="รายละเอียดการขาย" onBack={()=>setSelected(null)}>
      <section className="pos-summary-card grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="break-all font-bold">{selected.orderReference}</h2><StatusBadge order={selected}/></div>
        <p className="text-sm text-muted">คิว {String(selected.queueNumber).padStart(3,'0')} · {dateTime(selected.createdAt)} · {sourceLabel(selected.source)}</p>
        <p className="text-sm">ออเดอร์ {orderLabels[selected.orderStatus]} · {methodLabel(selected.paymentMethod)}</p>
        <ul className="divide-y divide-line border-y border-line">{selected.products.map((product,index)=><li key={index} className="flex justify-between gap-3 py-2"><span className="min-w-0 break-words">{product.name}</span><span className="shrink-0">× {product.quantity}</span></li>)}</ul>
        <p className="font-bold">ยอดออเดอร์ {formatThaiBaht(selected.totalSatang)}</p>
        {selected.paidAmountSatang!==null&&<p className="text-sm">ยอดรับชำระ {formatThaiBaht(selected.paidAmountSatang)}</p>}
      </section>
    </FormWorkspace>}
  </section>
}
