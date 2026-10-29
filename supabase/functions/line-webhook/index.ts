import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getLineDisplayName, replyLineMessage } from '../_shared/line-api.ts'

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function validSignature(rawBody: string, signature: string, channelSecret: string) {
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(channelSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    )
    return await crypto.subtle.verify('HMAC', key, fromBase64(signature), new TextEncoder().encode(rawBody))
  } catch {
    return false
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET')
  const channelAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
  if (!channelSecret || !channelAccessToken) return new Response('LINE secrets are not configured.', { status: 500 })

  const rawBody = await request.text()
  const signature = request.headers.get('x-line-signature') ?? ''
  if (!await validSignature(rawBody, signature, channelSecret)) {
    return new Response('Invalid signature', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const body = JSON.parse(rawBody)
  for (const event of body.events ?? []) {
    if (event.type !== 'message' || event.message?.type !== 'text' || event.source?.type !== 'user') continue
    const lineUserId = event.source.userId as string
    const displayName = await getLineDisplayName(channelAccessToken, lineUserId)
    const { data, error } = await supabase.rpc('register_line_subscription_message', {
      webhook_event_id: event.webhookEventId,
      requester_line_user_id: lineUserId,
      requester_display_name: displayName,
      submitted_shop_id: event.message.text,
    })
    if (error) throw error
    if (!event.replyToken || data?.code === 'DUPLICATE') continue
    const reply = data?.code === 'INVALID_SHOP'
      ? 'ไม่พบ Shop ID นี้ กรุณาตรวจสอบและส่ง UUID ของร้านอีกครั้ง'
      : data?.code === 'APPROVED'
        ? `บัญชีนี้ได้รับอนุมัติรับรายงานของร้าน ${data.shopName} แล้ว`
        : `ส่งคำขอรับรายงานของร้าน ${data.shopName} แล้ว กรุณารอ Owner อนุมัติใน DuckPOS`
    await replyLineMessage(channelAccessToken, event.replyToken, reply)
  }
  return new Response('OK', { status: 200 })
})

