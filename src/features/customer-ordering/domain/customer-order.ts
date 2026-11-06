export interface CartLine {
  key: string
  productId: string
  productName: string
  basePriceSatang: number
  quantity: number
  note: string
  options: Array<{ id: string; name: string; priceDeltaSatang: number }>
}

export interface CheckoutLocation {
  latitude: number
  longitude: number
  accuracyM: number
  capturedAt: string
}

export interface CheckoutResult {
  tableBillId?: string
  orderId: string
  queueNumber: number
  orderReference: string
  trackingToken: string
  status: OrderStatus
  totalSatang: number
}

export type OrderStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'

export interface TrackedOrder {
  orderId: string
  shopId: string
  shopName: string
  queueNumber: number
  orderReference: string
  status: OrderStatus
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED'
  totalSatang: number
  createdAt: string
  items: Array<{
    name: string
    quantity: number
    lineTotalSatang: number
    options: string[]
  }>
}
