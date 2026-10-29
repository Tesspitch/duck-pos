import type { CheckoutLocation } from '../domain/customer-order'

export interface CustomerLocationService {
  capture(): Promise<CheckoutLocation>
}
