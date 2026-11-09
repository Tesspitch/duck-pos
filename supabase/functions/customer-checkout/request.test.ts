// @vitest-environment node
import { expect, test } from 'vitest'
import { readCheckoutRequest } from './request'

const id = '10000000-0000-4000-8000-000000000001'
const order = { shopId: id, idempotencyKey: id, trackingToken: id, cartItems: [{ productId: id, quantity: 1 }] }
const checkoutRequest = (body: string) => new Request('http://localhost/checkout', { method: 'POST', body })

test('accepts takeout and automatic table checkout requests', async () => {
  await expect(readCheckoutRequest(checkoutRequest(JSON.stringify(order)))).resolves.toEqual(order)
  const tableOrder = { tableQrToken: id, billId: id, guestToken: id, tableEpoch: id }
  await expect(readCheckoutRequest(checkoutRequest(JSON.stringify({ ...order, tableOrder })))).resolves.toMatchObject({ tableOrder })
})

test('rejects malformed checkout input and oversized bodies without Content-Length', async () => {
  await expect(readCheckoutRequest(checkoutRequest('{'))).rejects.toMatchObject({ status: 400 })
  await expect(readCheckoutRequest(checkoutRequest(JSON.stringify({ ...order, shopId: 'invalid' })))).rejects.toMatchObject({ status: 400 })
  await expect(readCheckoutRequest(checkoutRequest('ก'.repeat(100_000)))).rejects.toMatchObject({ status: 413 })
})
