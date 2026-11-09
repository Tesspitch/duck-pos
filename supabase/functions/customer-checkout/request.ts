const maxBodyBytes = 256 * 1024
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class CheckoutRequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

type CheckoutBody = {
  shopId: string
  idempotencyKey: string
  trackingToken: string
  cartItems: unknown[]
  orderNote?: string
  location?: { latitude?: number; longitude?: number; accuracyM?: number; capturedAt?: string } | null
  tableOrder?: { tableQrToken: string; billId: string; guestToken: string; tableEpoch?: string } | null
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value)
}

export async function readCheckoutRequest(request: Request): Promise<CheckoutBody> {
  const oversized = () => new CheckoutRequestError('ข้อมูลออเดอร์มีขนาดใหญ่เกินไป', 413)
  if (Number(request.headers.get('content-length')) > maxBodyBytes) throw oversized()
  if (!request.body) throw new CheckoutRequestError('ไม่พบข้อมูลออเดอร์')

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let json = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBodyBytes) {
        void reader.cancel().catch(() => undefined)
        throw oversized()
      }
      json += decoder.decode(value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }

  let body: Partial<CheckoutBody> | null
  try {
    body = JSON.parse(json + decoder.decode())
  } catch {
    throw new CheckoutRequestError('ข้อมูลออเดอร์ไม่ใช่ JSON ที่ถูกต้อง')
  }
  if (!body || !isUuid(body.shopId) || !isUuid(body.idempotencyKey) || !isUuid(body.trackingToken)
    || !Array.isArray(body.cartItems) || body.cartItems.length < 1 || body.cartItems.length > 30
    || (body.orderNote != null && (typeof body.orderNote !== 'string' || [...body.orderNote].length > 500))) {
    throw new CheckoutRequestError('ข้อมูลออเดอร์ไม่ถูกต้อง')
  }

  const table = body.tableOrder
  if (table != null && (!isUuid(table.tableQrToken) || !isUuid(table.billId) || !isUuid(table.guestToken)
    || (table.tableEpoch != null && !isUuid(table.tableEpoch)))) {
    throw new CheckoutRequestError('ข้อมูลโต๊ะไม่ถูกต้อง')
  }
  return { ...body, shopId: body.shopId, idempotencyKey: body.idempotencyKey, trackingToken: body.trackingToken, cartItems: body.cartItems }
}
