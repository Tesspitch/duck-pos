import type { CartLine, CheckoutLocation, CheckoutResult, TrackedOrder } from '../domain/customer-order'
import type { PublicMenu } from '../domain/public-menu'
import type { TableOrderContext } from '../../dining/domain/dining'

export interface CustomerOrderingRepository {
  getMenu(shopId: string): Promise<PublicMenu | null>
  checkout(input: {
    shopId: string
    idempotencyKey: string
    trackingToken: string
    location: CheckoutLocation
    lines: CartLine[]
    note: string
    tableOrder?: TableOrderContext
  }): Promise<CheckoutResult>
  track(trackingToken: string): Promise<TrackedOrder | null>
  cancel(trackingToken: string): Promise<void>
}
