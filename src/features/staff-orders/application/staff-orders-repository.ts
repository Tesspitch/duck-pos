import type { PosCartLine } from '../domain/pos-cart'
import type {
  OrderStatus,
  PaymentMethod,
  PaymentResult,
  PosOrderResult,
  StaffOrderQueue,
} from '../domain/staff-order'

export interface CreatePosOrderInput {
  shopId: string
  idempotencyKey: string
  lines: PosCartLine[]
  note: string
}

export interface StaffOrdersRepository {
  listActive(shopId: string): Promise<StaffOrderQueue>
  createPosOrder(input: CreatePosOrderInput): Promise<PosOrderResult>
  updateStatus(orderId: string, expected: OrderStatus, next: OrderStatus, reason?: string): Promise<void>
  recordPayment(orderId: string, method: PaymentMethod, amountReceivedSatang: number): Promise<PaymentResult>
}

