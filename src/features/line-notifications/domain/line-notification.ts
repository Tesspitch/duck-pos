export type LineSubscriptionStatus = 'PENDING' | 'APPROVED' | 'REVOKED'
export type LineReportType = 'CLOSING' | 'PERIODIC'
export type ReportRunStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'PARTIAL' | 'FAILED' | 'NO_RECIPIENT'

export interface LineNotificationSettings {
  closingReportEnabled: boolean
  periodicReportEnabled: boolean
  reportTimes: string[]
}

export interface LineSubscription {
  id: string
  displayName: string | null
  lineUserHint: string
  status: LineSubscriptionStatus
  requestedAt: string
  approvedAt: string | null
}

export interface LineReportRun {
  id: string
  reportType: LineReportType
  status: ReportRunStatus
  recipientCount: number
  sentCount: number
  createdAt: string
  completedAt: string | null
  lastError: string | null
}

export interface LineNotificationManagement {
  shopId: string
  settings: LineNotificationSettings
  subscriptions: LineSubscription[]
  runs: LineReportRun[]
}

export function normalizeReportTimes(values: string[]) {
  const valid = values.filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value))
  return [...new Set(valid)].sort().slice(0, 6)
}

