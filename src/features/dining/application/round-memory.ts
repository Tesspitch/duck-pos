export interface SavedRound { billId: string; guestToken: string; tableQrToken: string; shopId: string; tableEpoch?: string }
const prefix = 'duckpos.dining.round.'
const pointer = 'duckpos.dining.table.'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function readRound(billId: string): SavedRound | null {
 try {
  const value = JSON.parse(localStorage.getItem(prefix+billId) ?? 'null') as SavedRound | null
  return value && value.billId === billId && uuid.test(value.guestToken) && uuid.test(value.tableQrToken) && uuid.test(value.shopId) ? value : null
 } catch { return null }
}
export function lastRound(tableToken: string): SavedRound | null {
 try { return readRound(localStorage.getItem(pointer+tableToken) ?? '') } catch { return null }
}
export function saveRound(round: SavedRound) {
 try {
  localStorage.setItem(prefix+round.billId,JSON.stringify(round))
  localStorage.setItem(pointer+round.tableQrToken,round.billId)
 } catch { throw new Error('กรุณาอนุญาตการเก็บข้อมูลในเบราว์เซอร์ เพื่อจดจำรอบโต๊ะ') }
}
export function findSavedRound(guestToken: string): SavedRound | null {
 try {
  for (let i=0;i<localStorage.length;i++) {
   const key=localStorage.key(i)
   if (key?.startsWith(prefix)) {
    const round=readRound(key.slice(prefix.length))
    if (round?.guestToken===guestToken) return round
   }
  }
 } catch { /* URL remains usable even without browser storage. */ }
 return null
}
export async function startRound(billId: string, tableQrToken: string, shopId: string): Promise<SavedRound> {
 const make = () => {
  const saved = readRound(billId) ?? { billId, tableQrToken, shopId, guestToken: crypto.randomUUID() }
  saveRound(saved)
  return saved
 }
 return navigator.locks ? navigator.locks.request('duckpos.dining.'+billId,make) : make()
}
export async function prepareAutomaticRound(tableEpoch: string, tableQrToken: string, shopId: string): Promise<SavedRound> {
 const make=()=>{
  const last=lastRound(tableQrToken)
  const saved=last?.tableEpoch===tableEpoch ? last : readRound(tableEpoch) ?? {billId:tableEpoch,guestToken:crypto.randomUUID(),tableQrToken,shopId,tableEpoch}
  saveRound(saved)
  return saved
 }
 return navigator.locks ? navigator.locks.request('duckpos.dining.'+tableEpoch,make) : make()
}
