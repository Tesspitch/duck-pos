export interface LineReportPayload {
  shopName: string
  reportType: 'OPENING' | 'CLOSING' | 'PERIODIC'
  businessDate: string
  openedAt: string | null
  closedAt: string | null
  periodStartedAt: string
  periodEndedAt: string
  cumulative: {
    collectedSatang: number
    orderCount: number
    cashSatang: number
    transferSatang: number
    cancelledCount: number
  }
  delta: {
    collectedSatang: number
    orderCount: number
    cashSatang: number
    transferSatang: number
  }
  bestSellingProducts: Array<{ name: string; quantity: number }>
}

const money = (satang: number) => new Intl.NumberFormat('th-TH', {
  style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(satang / 100)

export function formatLineReport(payload: LineReportPayload) {
  if (payload.reportType === 'OPENING') {
    return [
      '🟢 DuckPOS · เปิดร้านแล้ว',
      payload.shopName,
      `วันทำการ ${payload.businessDate}`,
      'ระบบพร้อมรับออเดอร์',
    ].join('\n')
  }
  const title = payload.reportType === 'CLOSING' ? 'สรุปปิดร้าน' : 'สรุปยอดตามเวลา'
  const lines = [
    `🦆 DuckPOS · ${title}`,
    payload.shopName,
    `วันทำการ ${payload.businessDate}`,
    '',
    `ยอดรับสุทธิ ${money(payload.cumulative.collectedSatang)}`,
    `ออเดอร์ ${payload.cumulative.orderCount} รายการ`,
    `เงินสด ${money(payload.cumulative.cashSatang)}`,
    `เงินโอน ${money(payload.cumulative.transferSatang)}`,
  ]
  if (payload.reportType === 'PERIODIC') {
    lines.push('', 'เพิ่มจากรายงานก่อน',
      `+${money(payload.delta.collectedSatang)} · ${payload.delta.orderCount} ออเดอร์`,
      `เงินสด +${money(payload.delta.cashSatang)} · เงินโอน +${money(payload.delta.transferSatang)}`)
  } else {
    lines.push(`ยกเลิก ${payload.cumulative.cancelledCount} รายการ`)
  }
  if (payload.bestSellingProducts.length) {
    lines.push('', 'เมนูขายดี', ...payload.bestSellingProducts.map((item, index) =>
      `${index + 1}. ${item.name} × ${item.quantity}`))
  }
  return lines.join('\n').slice(0, 5000)
}

export async function pushLineMessage(channelAccessToken: string, lineUserId: string, text: string, retryKey: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${channelAccessToken}`,
      'Content-Type': 'application/json',
      'X-Line-Retry-Key': retryKey,
    },
    body: JSON.stringify({ to: lineUserId, messages: [{ type: 'text', text }] }),
  })
  if (!response.ok) throw new Error(`LINE push failed (${response.status}): ${(await response.text()).slice(0, 500)}`)
}

export async function replyLineMessage(channelAccessToken: string, replyToken: string, text: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${channelAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: text.slice(0, 5000) }] }),
  })
  if (!response.ok) throw new Error(`LINE reply failed (${response.status}).`)
}

export async function getLineDisplayName(channelAccessToken: string, lineUserId: string) {
  const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, {
    headers: { 'Authorization': `Bearer ${channelAccessToken}` },
  })
  if (!response.ok) return ''
  const profile = await response.json()
  return typeof profile.displayName === 'string' ? profile.displayName : ''
}

