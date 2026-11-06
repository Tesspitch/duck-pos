import { afterEach, expect, test } from 'vitest'
import { tableCheckoutAttempt, clearTableCheckoutAttempt } from './checkout-attempt'
afterEach(()=>localStorage.clear())
test('lost-response retries reuse keys while changed cart and other bill get new keys',()=>{
 const first=tableCheckoutAttempt('bill','guest','cart')
 expect(tableCheckoutAttempt('bill','guest','cart')).toEqual(first)
 expect(tableCheckoutAttempt('bill','guest','other').idempotencyKey).not.toBe(first.idempotencyKey)
 expect(tableCheckoutAttempt('other','guest','cart').idempotencyKey).not.toBe(first.idempotencyKey)
 clearTableCheckoutAttempt('bill','guest')
 expect(tableCheckoutAttempt('bill','guest','cart').idempotencyKey).not.toBe(first.idempotencyKey)
})
