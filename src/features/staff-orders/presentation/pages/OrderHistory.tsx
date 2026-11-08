import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '../../../../shared/presentation/AppShell'
import { LoadingState } from '../../../../shared/presentation/LoadingState'
import { supabase } from '../../../../lib/supabase'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'

const labels = { QUEUED:'รอทำ', PREPARING:'กำลังทำ', READY:'พร้อมรับ', COMPLETED:'เสร็จแล้ว', CANCELLED:'ยกเลิก' }
const pageSize=20

export function OrderHistory() {
  const {activeMembership}=useActiveShop()
  const shopId=activeMembership?.shop_id
  const [date,setDate]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok'}).format(new Date()))
  const [page,setPage]=useState(0)
  const orders=useQuery({queryKey:['staff-order-history',shopId,date,page],enabled:!!shopId&&!!date,queryFn:async()=>{
    const {data,error}=await supabase.from('orders').select('id,queue_number,order_reference,source,status,total_satang,created_at,order_items(product_name,quantity)').eq('shop_id',shopId!).eq('business_date',date).order('created_at',{ascending:false}).order('id').range(page*pageSize,(page+1)*pageSize)
    if(error)throw error
    return data
  }})
  return <AppShell><main className="mx-auto max-w-4xl">
    <h1>ประวัติออเดอร์</h1>
    <label className="my-4 grid max-w-xs gap-1 text-sm font-semibold">วันทำการ<input type="date" className="rounded-xl border border-line px-3" value={date} onChange={e=>{setDate(e.target.value);setPage(0)}}/></label>
    {orders.isFetching&&<LoadingState label="กำลังโหลดประวัติ…"/>}
    {orders.isError&&<p role="alert" className="pos-summary-card">โหลดประวัติไม่สำเร็จ <button onClick={()=>void orders.refetch()} className="font-bold text-brand-action">ลองใหม่</button></p>}
    {orders.data?.length===0&&<p className="pos-summary-card">ไม่มีออเดอร์ในวันที่เลือก</p>}
    <div className="queue-ticket-grid">{orders.data?.slice(0,pageSize).map(order=><article key={order.id} className="pos-summary-card"><header className="flex items-center justify-between gap-2"><strong className="queue-ticket-number">#{String(order.queue_number).padStart(3,'0')}</strong><span className="queue-status">{labels[order.status as keyof typeof labels]??order.status}</span></header><p className="text-sm text-muted">{order.order_reference} · {order.source==='QR'?'QR':'หน้าร้าน'}</p><ul className="my-3 border-t border-line pt-3 text-sm">{order.order_items.map((item,index)=><li key={index}>{item.quantity} × {item.product_name}</li>)}</ul><strong>฿{(order.total_satang/100).toFixed(2)}</strong></article>)}</div>
    {((orders.data?.length??0)>pageSize||page>0)&&<div className="pos-chips mt-4"><button disabled={page===0||orders.isFetching} onClick={()=>setPage(page-1)}>ก่อนหน้า</button><button disabled={(orders.data?.length??0)<=pageSize||orders.isFetching} onClick={()=>setPage(page+1)}>ถัดไป</button></div>}
  </main></AppShell>
}
