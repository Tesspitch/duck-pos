// Keep the same server idempotency key when a response is lost and the page reloads.
export function tableCheckoutAttempt(billId: string, guestToken: string, signature: string) {
 const key = `duckpos.dining.checkout.${billId}.${guestToken}`
 const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
 if (saved?.signature === signature && typeof saved.idempotencyKey === 'string' && typeof saved.trackingToken === 'string') return saved as { idempotencyKey: string; trackingToken: string }
 const attempt = { signature, idempotencyKey: crypto.randomUUID(), trackingToken: crypto.randomUUID() }
 localStorage.setItem(key,JSON.stringify(attempt))
 return attempt
}
export function clearTableCheckoutAttempt(billId: string, guestToken: string) {
 try { localStorage.removeItem(`duckpos.dining.checkout.${billId}.${guestToken}`) } catch { /* Already accepted by the server. */ }
}
