import type { CartLine, CheckoutLocation, CheckoutResult, TrackedOrder } from '../domain/customer-order'
import type { PublicMenu } from '../domain/public-menu'

export interface CustomerOrderingRepository {
  getMenu(shopId: string): Promise<PublicMenu | null>
  checkout(input: {
    shopId: string
    idempotencyKey: string
    trackingToken: string
    location: CheckoutLocation
    lines: CartLine[]
    note: string
  }): Promise<CheckoutResult>
  track(trackingToken: string): Promise<TrackedOrder | null>
}
