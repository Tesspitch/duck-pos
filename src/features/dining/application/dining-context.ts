import { createContext, useContext } from 'react'
import type { DiningBill, DiningContext, DiningTable, TrackedRound } from '../domain/dining'
export interface DiningRepository {
 list(shopId: string): Promise<DiningTable[]>
 create(shopId: string, name: string): Promise<string>
 open(tableId: string): Promise<string>
 bill(billId: string): Promise<DiningBill>
 checkout(billId: string, freeze: boolean): Promise<void>
 close(billId: string): Promise<void>
 pay(input: { billId: string; method: 'CASH' | 'BANK_TRANSFER'; receivedSatang: number; requestId: string; fingerprint: string }): Promise<{ totalSatang: number; changeSatang: number }>
 context(qrToken: string): Promise<DiningContext | null>
 track(token: string): Promise<TrackedRound | null>
 cancel(token: string, orderId: string): Promise<void>
}
export const DiningContextProvider = createContext<DiningRepository | null>(null)
export function useDiningRepository() {
 const value = useContext(DiningContextProvider)
 if (!value) throw new Error('DiningProvider is missing.')
 return value
}
