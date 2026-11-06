import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useDiningAction } from '../application/use-dining'
import { Icon } from '../../../shared/presentation/Icon'
import { diningError } from '../domain/dining'
import { billLabels, diningMoney, type TrackedRound } from '../domain/dining'
import { TablePaymentSuccess } from './TablePaymentSuccess'
const statuses: Record<string,string> = { QUEUED: 'รอทำ', PREPARING: 'กำลังทำ', READY: 'พร้อมเสิร์ฟ', COMPLETED: 'เสร็จแล้ว', CANCELLED: 'ยกเลิก' }
export function TableRoundSummary({ round, token }: { round: TrackedRound; token: string }) {
 const action = useDiningAction(round.shopId)
 const [cancelId,setCancelId] = useState<string|null>(null)
 if(round.status==='PAID')return <TablePaymentSuccess round={round}/>
 const finished = round.status === 'VOID' || round.closed
 return <section className="mx-auto grid w-full min-w-0 max-w-3xl gap-4 p-4 pb-28">
  <header className="border border-line bg-white p-5"><p className="text-sm text-muted">{round.shopName}</p><h1 className="mt-1 text-2xl font-bold">{round.tableName}</h1><p className={`mt-3 border p-3 font-bold ${finished ? 'border-green-300 bg-green-50 text-green-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>{finished ? 'รอบโต๊ะนี้สิ้นสุดแล้ว' : billLabels[round.status]}</p><p className="mt-3 text-sm">รายการที่คุณสั่ง {diningMoney(round.ownTotalSatang)}</p><p className="mt-1 text-xs text-muted">ลิงก์นี้แสดงเฉพาะรายการของคุณในรอบนี้</p></header>
  {round.orders.map((order,index) => <article key={order.id} className="min-w-0 border border-line bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold">รอบสั่งที่ {index+1} · คิว {String(order.queueNumber).padStart(3,'0')}</h2><span className="font-semibold text-brand-action">{statuses[order.status] ?? order.status}</span></div><ul className="mt-3 grid gap-3">{order.items.map((item,i) => <li key={i}><strong>{item.quantity} × {item.name}</strong><p className="text-sm text-muted">{item.options.join(' · ')}</p></li>)}</ul><p className="mt-3 text-right font-bold">{diningMoney(order.totalSatang)}</p></article>)}
  {!finished && round.acceptingOrders && <Link className="flex min-h-12 items-center justify-center bg-brand-action px-4 font-bold text-white" to={`/table/${round.tableQrToken}`}>สั่งเพิ่มในรอบนี้</Link>}
  {round.status==='OPEN' && round.orders.filter(order=>order.status==='QUEUED').map(order=><div key={order.id} className="border border-line bg-white p-3"><button disabled={action.isPending} className="min-h-11 px-3 text-sm text-red-700" onClick={()=>setCancelId(order.id)}>ยกเลิกคิว {String(order.queueNumber).padStart(3,'0')}</button>{cancelId===order.id&&<div className="grid gap-3 p-2"><p>ยกเลิกรายการรอบนี้?</p><div className="flex gap-3"><button className="border border-line px-3" onClick={()=>setCancelId(null)}>ย้อนกลับ</button><button disabled={action.isPending} className="bg-red-700 px-3 text-white" onClick={()=>action.mutate(r=>r.cancel(token,order.id),{onSuccess:()=>setCancelId(null)})}>{action.isPending?'กำลังยกเลิก…':'ยืนยันยกเลิก'}</button></div></div>}</div>)}
  {action.error&&<p role="alert" className="text-red-700">{diningError(action.error)}</p>}
  {!round.acceptingOrders && !finished && <p className="border border-line bg-white p-4 text-sm">ขณะนี้ยังสั่งเพิ่มไม่ได้ กรุณาติดต่อพนักงาน</p>}
  {finished&&<p className="border border-line bg-white p-4 text-sm">หากต้องการสั่งใหม่ กรุณาสแกน QR ที่โต๊ะอีกครั้ง</p>}
  <nav className="customer-bottom-navigation" aria-label="เมนูโต๊ะ">{!finished&&<Link to={`/table/${round.tableQrToken}`}><Icon name="menu" size={22}/><span>เมนู / โต๊ะ</span></Link>}<Link aria-current="page" to={`/table-round/${token}`}><Icon name="clock" size={22}/><span>สถานะรอบนี้</span></Link></nav>
 </section>
}
