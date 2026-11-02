export const trackingRecordPrefix = 'duckpos.customer-order.'
export const trackingSelectionPrefix = 'duckpos.customer-order-selection.'
export const legacyTrackingKey = 'duckpos-customer-tracking'

interface SavedOrder { shopId: string; token: string; savedAt: number }
export interface SavedTracking {
  tokensByShop: Record<string, string>
  historyByShop: Record<string, string[]>
}

let lastSavedAt = 0

// One key per order prevents two tabs from overwriting each other's history.
export function saveTrackingOrder(shopId: string, token: string, select = true) {
  const key = `${trackingRecordPrefix}${encodeURIComponent(shopId)}.${encodeURIComponent(token)}`
  if (!localStorage.getItem(key)) {
    lastSavedAt = Math.max(Date.now(), lastSavedAt + 1)
    localStorage.setItem(key, JSON.stringify({ shopId, token, savedAt: lastSavedAt }))
  }
  if (select) localStorage.setItem(`${trackingSelectionPrefix}${shopId}`, token)
}

export function migrateTabTracking() {
  // Both the legacy single-token and multi-token formats are supported.
  for (const storage of [sessionStorage, localStorage]) {
    const raw = storage.getItem(legacyTrackingKey)
    if (!raw) continue
    let state: Partial<SavedTracking>
    try { state = JSON.parse(raw)?.state ?? {} } catch { continue }
    const histories = state.historyByShop ?? {}
    const latest = state.tokensByShop ?? {}
    for (const shopId of new Set([...Object.keys(histories), ...Object.keys(latest)])) {
      const history = Array.isArray(histories[shopId]) ? histories[shopId] : []
      const selected = latest[shopId]
      const tokens = [...new Set([...history, ...(typeof selected === 'string' ? [selected] : [])])]
      for (const token of tokens.reverse()) {
        if (typeof token === 'string' && token) saveTrackingOrder(shopId, token, false)
      }
      if (selected && !localStorage.getItem(`${trackingSelectionPrefix}${shopId}`)) {
        localStorage.setItem(`${trackingSelectionPrefix}${shopId}`, selected)
      }
    }
    // Remove legacy data only after every order has been saved successfully.
    storage.removeItem(legacyTrackingKey)
  }
}

export function readSavedTracking(): SavedTracking {
  const records: SavedOrder[] = []
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (!key?.startsWith(trackingRecordPrefix)) continue
    try {
      const record = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (record && typeof record.shopId === 'string' && typeof record.token === 'string'
        && typeof record.savedAt === 'number' && Number.isFinite(record.savedAt)) records.push(record)
    } catch { /* An invalid record must not hide other orders. */ }
  }
  records.sort((a, b) => b.savedAt - a.savedAt || a.token.localeCompare(b.token))
  const result: SavedTracking = { tokensByShop: {}, historyByShop: {} }
  for (const { shopId, token } of records) {
    const history = result.historyByShop[shopId] ??= []
    if (!history.includes(token)) history.push(token)
  }
  for (const [shopId, tokens] of Object.entries(result.historyByShop)) {
    const selection = localStorage.getItem(`${trackingSelectionPrefix}${shopId}`)
    const latest = tokens[0]
    if (latest) result.tokensByShop[shopId] = selection && tokens.includes(selection) ? selection : latest
  }
  return result
}
