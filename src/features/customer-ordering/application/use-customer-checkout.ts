import { useMutation } from '@tanstack/react-query'

import type { CartLine, CheckoutLocation } from '../domain/customer-order'
import { useCustomerOrderingRepository } from './customer-ordering-context'
import type { TableOrderContext } from '../../dining/domain/dining'

export function useCustomerCheckout() {
  const repository = useCustomerOrderingRepository()
  return useMutation({
    mutationFn: (input: {
      shopId: string
      idempotencyKey: string
      trackingToken: string
      location: CheckoutLocation
      lines: CartLine[]
      note: string
      tableOrder?: TableOrderContext
    }) => repository.checkout(input),
  })
}
