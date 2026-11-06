import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { lastRound, prepareAutomaticRound, readRound, saveRound, startRound } from './round-memory'
const bill='10000000-0000-4000-8000-000000000001'
const nextBill='10000000-0000-4000-8000-000000000002'
const table='20000000-0000-4000-8000-000000000001'
const shop='30000000-0000-4000-8000-000000000001'
beforeEach(()=>localStorage.clear())
afterEach(()=>vi.restoreAllMocks())
test('reopening a tab or scanning the same table restores the same round token',async()=>{
 const first=await startRound(bill,table,shop)
 expect(await startRound(bill,table,shop)).toEqual(first)
 expect(lastRound(table)).toEqual(first)
})
test('starting another round preserves the original receipt rather than rebinding it',async()=>{
 const old=await startRound(bill,table,shop)
 const next=await startRound(nextBill,table,shop)
 expect(next.guestToken).not.toBe(old.guestToken)
 expect(readRound(bill)).toEqual(old)
 expect(lastRound(table)?.billId).toBe(nextBill)
})
test('corrupted stored identities are ignored',()=>{
 localStorage.setItem('duckpos.dining.round.'+bill,'{"billId":"'+bill+'","guestToken":"bad"}')
 expect(readRound(bill)).toBeNull()
})
test('storage denial prevents starting a round without a recoverable token',()=>{
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('denied')})
 expect(()=>saveRound({billId:bill,guestToken:bill,tableQrToken:table,shopId:shop})).toThrow('กรุณาอนุญาต')
})

test('draft identity survives reload and the server bill replaces the draft without changing guest',async()=>{
 const draft=await prepareAutomaticRound(bill,table,shop)
 expect(await prepareAutomaticRound(bill,table,shop)).toEqual(draft)
 saveRound({...draft,billId:nextBill})
 expect((await prepareAutomaticRound(bill,table,shop)).billId).toBe(nextBill)
 expect((await prepareAutomaticRound(bill,table,shop)).guestToken).toBe(draft.guestToken)
 const next=await prepareAutomaticRound('10000000-0000-4000-8000-000000000003',table,shop)
 expect(next.guestToken).not.toBe(draft.guestToken)
 expect(readRound(nextBill)?.guestToken).toBe(draft.guestToken)
})
