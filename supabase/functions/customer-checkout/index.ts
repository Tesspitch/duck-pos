import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST' || !origin || !allowedOrigins.has(origin)) {
    return new Response(JSON.stringify({ error: 'Request origin is not allowed.' }), { status: 403, headers })
  }

  try {
    const body = await request.json()
    const ip = request.headers.get('cf-connecting-ip')
      ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? 'unknown'
    const salt = Deno.env.get('RATE_LIMIT_SALT')
    if (!salt) throw new Error('RATE_LIMIT_SALT is not configured.')
    const fingerprint = await sha256(`${salt}:${ip}:${request.headers.get('user-agent') ?? ''}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const { data: allowed, error: rateError } = await supabase.rpc(
      'consume_checkout_rate_limit',
      { target_shop_id: body.shopId, request_fingerprint: fingerprint },
    )
    if (rateError) throw rateError
    if (!allowed) return new Response(JSON.stringify({ error: 'ส่งออเดอร์ถี่เกินไป กรุณารอสักครู่' }), { status: 429, headers })

    const { data, error } = await supabase.rpc('create_qr_order', {
      target_shop_id: body.shopId,
      request_idempotency_key: body.idempotencyKey,
      request_tracking_token: body.trackingToken,
      customer_latitude: body.location?.latitude,
      customer_longitude: body.location?.longitude,
      customer_accuracy_m: body.location?.accuracyM,
      location_captured_at: body.location?.capturedAt,
      cart_items: body.cartItems,
      order_note: body.orderNote ?? '',
    })
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers })
    return new Response(JSON.stringify(data), { status: 200, headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed.'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers })
  }
})
