import type { LineNotificationManagement, LineNotificationSettings, LineSubscriptionStatus } from '../domain/line-notification'

export interface LineNotificationRepository {
  getManagement(shopId: string): Promise<LineNotificationManagement>
  updateSettings(shopId: string, settings: LineNotificationSettings): Promise<LineNotificationManagement>
  setSubscriptionStatus(shopId: string, subscriptionId: string, status: Extract<LineSubscriptionStatus, 'APPROVED' | 'REVOKED'>): Promise<void>
}

