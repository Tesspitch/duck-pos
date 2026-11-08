import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Icon, type IconName } from '../../shared/presentation/Icon'
import { formatThaiBaht } from '../../features/catalog/domain/money'
import { useSalesDashboard } from '../../features/sales-analytics/application/use-sales-analytics'
import { staffOrdersQueryKey } from '../../features/staff-orders/application/use-staff-orders'
import { useStaffOrdersRealtime } from '../../features/staff-orders/application/use-staff-orders-realtime'

const shopDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' })
const shopTime = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
const statuses: Record<string, string> = { QUEUED: 'ใหม่', PREPARING: 'กำลังทำ', READY: 'พร้อมรับ', COMPLETED: 'เสร็จแล้ว', CANCELLED: 'ยกเลิก' }

function comparison(current: number | undefined, previous: number | undefined) {
  if (current === undefined || previous === undefined || previous === 0) return null
  const percent = Math.round((current - previous) / previous * 100)
  return `${percent > 0 ? '+' : ''}${percent}% จากเมื่อวาน`
}

function Metric({ label, value, icon, change }: { label: string; value: string; icon: IconName; change?: string | null }) {
  return <div className="pos-summary-card flex items-start gap-2 p-3">
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-action"><Icon name={icon} size={18}/></span>
    <div className="min-w-0"><p className="text-xs font-medium text-muted">{label}</p><strong className="block break-words text-xl tabular-nums">{value}</strong>{change&&<p className="text-xs text-muted">{change}</p>}</div>
  </div>
}

export function HomeActivity({ shopId, owner }: { shopId: string; owner: boolean }) {
  const now = new Date()
  const today = shopDate.format(now)
  const yesterday = shopDate.format(new Date(now.getTime() - 86_400_000))
  useStaffOrdersRealtime(shopId)
  const activity = useQuery({
    queryKey: [...staffOrdersQueryKey(shopId), 'overview', today],
    refetchInterval: 60_000,
    staleTime: 10_000,
    queryFn: async () => {
      const count = (day: string) => supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('business_date', day)
      const [latest, queued, ready, previous] = await Promise.all([
        supabase.from('orders').select('queue_number, status, created_at, total_satang, order_items(count)', { count: 'exact' }).eq('shop_id', shopId).eq('business_date', today).order('queue_number', { ascending: false }).limit(1),
        count(today).eq('status', 'QUEUED'), count(today).eq('status', 'READY'), count(yesterday),
      ])
      const error = latest.error ?? queued.error ?? ready.error ?? previous.error
      if (error) throw error
      return { latest: latest.data?.[0], total: latest.count ?? 0, queued: queued.count ?? 0, ready: ready.count ?? 0, previous: previous.count ?? 0 }
    },
  })
  const sales = useSalesDashboard(owner ? shopId : undefined, { dateFrom: today, dateTo: today, storeSessionId: null, bucket: 'DAY' })
  const previousSales = useSalesDashboard(owner ? shopId : undefined, { dateFrom: yesterday, dateTo: yesterday, storeSessionId: null, bucket: 'DAY' })
  const data = activity.data
  const latest = data?.latest
  const totalSales = sales.data?.netCollectedSalesSatang
  return <section className="grid gap-3" aria-label="สรุปออเดอร์วันนี้">
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {owner&&<Metric label="ยอดรับเงินจริงวันนี้" icon="chart" value={totalSales===undefined?'—':formatThaiBaht(totalSales)} change={comparison(totalSales,previousSales.data?.netCollectedSalesSatang)}/>}
      <Metric label="จำนวนออเดอร์" icon="queue" value={data?String(data.total):'—'} change={comparison(data?.total,data?.previous)}/>
      <Metric label="ออเดอร์ใหม่" icon="bag" value={data?String(data.queued):'—'}/>
      <Metric label="พร้อมรับ" icon="check" value={data?String(data.ready):'—'}/>
    </div>
    {activity.isError&&<p role="alert" className="text-sm text-red-700">โหลดออเดอร์ไม่สำเร็จ <button type="button" className="underline" onClick={()=>void activity.refetch()}>ลองใหม่</button></p>}
    {sales.isError&&<p role="alert" className="text-sm text-red-700">โหลดยอดขายไม่สำเร็จ <button type="button" className="underline" onClick={()=>void sales.refetch()}>ลองใหม่</button></p>}
    <div className="pos-summary-card">
      <div className="flex flex-wrap items-center justify-between gap-x-2"><h2 className="font-bold">ออเดอร์ล่าสุด</h2><Link to="/queue" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-action">ดูทั้งหมด →</Link></div>
      {latest?<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"><strong>#{String(latest.queue_number).padStart(3,'0')}</strong><span className="text-muted">{shopTime.format(new Date(latest.created_at))} · {latest.order_items?.[0]?.count??0} รายการ</span><strong>{formatThaiBaht(latest.total_satang)}</strong><span className="rounded-md bg-[#f1f3f0] px-2 py-1 text-xs">{statuses[latest.status]??latest.status}</span></div>:<p className="text-sm text-muted">{activity.isPending?'กำลังโหลดออเดอร์…':activity.isError?'—':'ยังไม่มีออเดอร์วันนี้'}</p>}
    </div>
  </section>
}
