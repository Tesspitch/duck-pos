import { useState } from 'react'

import { AppShell } from '../../../../shared/presentation/AppShell'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useLineNotificationManagement, useSetLineSubscriptionStatus, useUpdateLineSettings } from '../../application/use-line-notifications'
import { LineReportRunList } from '../components/LineReportRunList'
import { LineSettingsForm } from '../components/LineSettingsForm'
import { LineSubscriberList } from '../components/LineSubscriberList'

const errorText = (error: unknown) => error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ'

export function LineNotificationPage() {
  const { activeMembership } = useActiveShop()
  const shopId = activeMembership?.shop_id ?? ''
  const management = useLineNotificationManagement(shopId)
  const updateSettings = useUpdateLineSettings(shopId)
  const updateSubscription = useSetLineSubscriptionStatus(shopId)
  const [copied, setCopied] = useState(false)
  const error = management.error ?? updateSettings.error ?? updateSubscription.error

  async function copyShopId() {
    await navigator.clipboard.writeText(shopId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return <AppShell><main className="mx-auto max-w-5xl p-4 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-brand-action">Phase 7 · Owner</p><h1 className="text-2xl font-bold">LINE Sales Report</h1><p className="text-sm text-muted">{activeMembership?.shops?.name}</p></div><button type="button" onClick={() => void management.refetch()} className="rounded-lg border border-line px-3">รีเฟรช</button></div>
    <section className="mt-5 rounded-2xl bg-brand-soft p-4"><h2 className="font-bold">วิธีสมัครรับรายงาน</h2><ol className="mt-2 list-inside list-decimal space-y-1 text-sm"><li>เพิ่ม DuckPOS LINE Official Account</li><li>ส่ง Shop ID ด้านล่างผ่านแชท</li><li>Owner อนุมัติคำขอในหน้านี้</li></ol><div className="mt-3 flex flex-wrap gap-2"><code className="min-h-11 flex-1 break-all rounded-lg bg-white p-3 text-sm">{shopId}</code><button type="button" onClick={() => void copyShopId()} className="rounded-lg bg-brand-action px-4 font-semibold text-white">{copied ? 'คัดลอกแล้ว' : 'คัดลอก Shop ID'}</button></div><p className="mt-2 text-xs text-muted">Shop ID ใช้ระบุร้านเท่านั้น ไม่ใช่รหัสผ่าน และผู้รับต้องได้รับการอนุมัติจาก Owner</p></section>
    {management.isLoading ? <p className="p-8 text-center">กำลังโหลดการตั้งค่า LINE…</p> : null}
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{errorText(error)}</p> : null}
    {management.data ? <div className="mt-5 grid gap-4 sm:grid-cols-2"><LineSettingsForm key={JSON.stringify(management.data.settings)} settings={management.data.settings} pending={updateSettings.isPending} onSave={(settings) => updateSettings.mutateAsync(settings).then(() => undefined)} /><LineSubscriberList subscriptions={management.data.subscriptions} pending={updateSubscription.isPending} onChange={(subscriptionId, status) => updateSubscription.mutateAsync({ subscriptionId, status })} /><LineReportRunList runs={management.data.runs} /></div> : null}
  </main></AppShell>
}
