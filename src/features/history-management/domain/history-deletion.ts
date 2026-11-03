export type HistoryKind = 'SALES' | 'NOTIFICATIONS'
export interface HistoryRange { shopId: string; kind: HistoryKind; dateFrom: string; dateTo: string }
export interface HistoryDeletionPreview { count: number; grossSatang: number; collectedSatang: number; fingerprint: string; blockedReason: string | null }
export interface HistoryDeletionInput extends HistoryRange { fingerprint: string; confirmationName: string }
export interface OrderDeletionTarget { shopId: string; orderId: string }
export interface OrderDeletionPreview extends HistoryDeletionPreview { orderReference: string; queueNumber: number }
export interface OrderDeletionInput extends OrderDeletionTarget { fingerprint: string; confirmationName: string }
