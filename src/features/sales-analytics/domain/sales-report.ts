export type ReportBucket = 'DAY' | 'MONTH'
export type SalesSortMode = 'LATEST' | 'OLDEST' | 'HIGHEST_AMOUNT' | 'LOWEST_AMOUNT'
export type SalesOrderSource = 'QR' | 'POS'
export type SalesOrderStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'
export type SalesPaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'
export type SalesPaymentMethod = 'CASH' | 'BANK_TRANSFER'

export interface SalesDashboardFilter {
  dateFrom: string
  dateTo: string
  storeSessionId: string | null
  bucket: ReportBucket
}

export interface BestSellingProduct {
  productId: string
  productName: string
  quantity: number
  salesSatang: number
}

export interface SourceSales {
  source: SalesOrderSource
  orderCount: number
  collectedSatang: number
}

export interface SalesTrendPoint {
  period: string
  grossOrderValueSatang: number
  netCollectedSalesSatang: number
  orderCount: number
}

export interface SalesDashboard {
  grossOrderValueSatang: number
  netCollectedSalesSatang: number
  paidOrders: number
  unpaidOrders: number
  cancelledOrders: number
  productsSold: number
  averageOrderValueSatang: number
  cashSalesSatang: number
  transferSalesSatang: number
  bestSellingProducts: BestSellingProduct[]
  sourceSales: SourceSales[]
  trend: SalesTrendPoint[]
}

export interface SalesHistoryQuery extends SalesDashboardFilter {
  source: SalesOrderSource | null
  orderStatus: SalesOrderStatus | null
  paymentStatus: SalesPaymentStatus | null
  paymentMethod: SalesPaymentMethod | null
  search: string
  sort: SalesSortMode
  page: number
  pageSize: number
}

export interface SalesHistoryProduct {
  name: string
  quantity: number
}

export interface SalesHistoryItem {
  id: string
  businessDate: string
  createdAt: string
  storeSessionId: string
  queueNumber: number
  orderReference: string
  source: SalesOrderSource
  orderStatus: SalesOrderStatus
  paymentStatus: SalesPaymentStatus
  paymentMethod: SalesPaymentMethod | null
  totalSatang: number
  paidAmountSatang: number | null
  paidAt: string | null
  products: SalesHistoryProduct[]
}

export interface SalesHistoryPage {
  totalCount: number
  page: number
  pageSize: number
  items: SalesHistoryItem[]
}

export interface SalesSessionOption {
  id: string
  businessDate: string
  status: 'OPEN' | 'CLOSED'
  openedAt: string
  closedAt: string | null
}

export function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todaySalesFilter(): SalesDashboardFilter {
  const today = dateInputValue(new Date())
  return { dateFrom: today, dateTo: today, storeSessionId: null, bucket: 'DAY' }
}

export function validateDateRange(dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) return 'กรุณาระบุช่วงวันที่'
  const start = new Date(`${dateFrom}T00:00:00`)
  const end = new Date(`${dateTo}T00:00:00`)
  if (start > end) return 'วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด'
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  if (days > 365) return 'ช่วงรายงานต้องไม่เกิน 366 วัน'
  return null
}

export function csvCell(value: string | number | null) {
  const text = value === null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function salesHistoryCsv(items: SalesHistoryItem[]) {
  const header = ['วันทำการ', 'เวลาสั่ง', 'เลขอ้างอิง', 'คิว', 'ช่องทาง', 'สถานะออเดอร์', 'สถานะชำระ', 'วิธีชำระ', 'ยอดออเดอร์ (บาท)', 'ยอดรับ (บาท)', 'สินค้า']
  const rows = items.map((item) => [
    item.businessDate,
    item.createdAt,
    item.orderReference,
    item.queueNumber,
    item.source,
    item.orderStatus,
    item.paymentStatus,
    item.paymentMethod,
    (item.totalSatang / 100).toFixed(2),
    item.paidAmountSatang === null ? '' : (item.paidAmountSatang / 100).toFixed(2),
    item.products.map((product) => `${product.name} x${product.quantity}`).join(' | '),
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
