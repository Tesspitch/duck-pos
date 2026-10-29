export type OrderStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER'

export interface StaffOrderItem {
  id: string
  name: string
  quantity: number
  note: string
  lineTotalSatang: number
  options: string[]
}

export interface StaffOrderPayment {
  method: PaymentMethod
  amountReceivedSatang: number
  changeSatang: number
  paidAt: string
}

export interface StaffOrder {
  id: string
  queueNumber: number
  orderReference: string
  source: 'QR' | 'POS'
  status: OrderStatus
  paymentStatus: PaymentStatus
  totalSatang: number
  customerNote: string
  createdAt: string
  items: StaffOrderItem[]
  payment: StaffOrderPayment | null
}

export interface StaffOrderQueue {
  isOpen: boolean
  orders: StaffOrder[]
}

export interface PosOrderResult {
  orderId: string
  queueNumber: number
  orderReference: string
  status: OrderStatus
  totalSatang: number
}

export interface PaymentResult {
  orderId: string
  paymentStatus: 'PAID'
  method: PaymentMethod
  amountReceivedSatang: number
  changeSatang: number
}

