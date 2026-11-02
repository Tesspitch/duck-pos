export type HistoryKind = 'SALES' | 'NOTIFICATIONS'
export interface HistoryRange { shopId: string; kind: HistoryKind; dateFrom: string; dateTo: string }
export interface HistoryDeletionPreview { count: number; grossSatang: number; collectedSatang: number; fingerprint: string; blockedReason: string | null }
export interface HistoryDeletionInput extends HistoryRange { fingerprint: string; confirmationName: string }
