import { useRef, useState } from 'react'
import { getPaymentQr } from '../../shop-settings/infrastructure/payment-qr-repository'
import { useActiveShop } from '../../shop-context/application/active-shop-context'
import { renderBill } from './print-table-bill'
import { Link } from 'react-router-dom'
import { FormWorkspace } from '../../../shared/presentation/FormWorkspace'
import { LoadingState } from '../../../shared/presentation/LoadingState'
import { useDiningAction, useDiningBill } from '../application/use-dining'
import { billLabels, diningError, diningMoney, type DiningBill } from '../domain/dining'

export function TableBillPanel({ billId, shopId, onBack }: { billId: string; shopId: string; onBack: () => void }) {
 const bill = useDiningBill(billId)
 const action = useDiningAction(shopId)
 const [confirmClose,setConfirmClose] = useState(false)
 const {activeMembership}=useActiveShop()
 const [printing,setPrinting]=useState(false)
 const [printError,setPrintError]=useState('')
 async function printBill() {
  const popup=window.open('','_blank');if(!popup){setPrintError('กรุณาอนุญาตเปิดหน้าต่างเพื่อพิมพ์บิล');return}
  popup.document.body.textContent='กำลังโหลดบิลล่าสุด…';setPrinting(true);setPrintError('')
  try {
   const [fresh,qr]=await Promise.all([bill.refetch(),getPaymentQr(shopId)])
   if(fresh.error||!fresh.data||fresh.data.shopId!==shopId)throw new Error('Invalid bill')
   popup.document.open();popup.document.write(renderBill(fresh.data,activeMembership?.shops?.name??'ร้าน',qr));popup.document.close()
  }catch{popup.close();setPrintError('โหลดบิลหรือ QR ไม่สำเร็จ กรุณาลองใหม่')}finally{setPrinting(false)}
 }
 return <FormWorkspace title={bill.data?.tableName ?? 'บิลโต๊ะ'} busy={action.isPending} onBack={onBack}>
  {bill.isPending && <LoadingState label="กำลังโหลดบิล…" />}
  {bill.error && <p role="alert">{diningError(bill.error)}</p>}
  {bill.data && bill.data.shopId !== shopId && <p role="alert">บิลนี้อยู่คนละสาขา กรุณาสลับสาขาก่อน</p>}
  {bill.data && bill.data.shopId === shopId && <section className="grid min-w-0 gap-4">
   <button disabled={printing} className="min-h-12 border border-line bg-white px-4 font-semibold" onClick={()=>void printBill()}>{printing?'กำลังเตรียมบิล…':'พิมพ์บิล / บันทึก PDF'}</button>
   {printError&&<p role="alert" className="text-red-700">{printError}</p>}
   <header className="flex flex-wrap justify-between gap-3 border border-line bg-white p-4"><div><h2 className="text-2xl font-bold">{bill.data.tableName}</h2><p>{billLabels[bill.data.status]}{bill.data.closed ? ' · ปิดโต๊ะแล้ว' : ''}</p></div><strong className="text-2xl text-brand-action">{diningMoney(bill.data.totalSatang)}</strong></header>
   {bill.data.orders.map(order => <article key={order.id} className={`min-w-0 border border-line bg-white p-4 ${order.status==='CANCELLED' ? 'opacity-60' : ''}`}><div className="flex flex-wrap justify-between gap-2"><strong>คิว {String(order.queueNumber).padStart(3,'0')}</strong><span>{order.status==='CANCELLED' ? 'ยกเลิก' : order.status==='COMPLETED' ? 'เสร็จแล้ว' : 'อาหารยังไม่ครบ'}</span></div><ul className="mt-3 grid gap-2">{order.items.map((item,i) => <li key={i}><strong>{item.quantity} × {item.name}</strong><p className="text-sm text-muted">{item.options.join(' · ')} {item.note}</p></li>)}</ul><p className="mt-3 text-right font-bold">{diningMoney(order.totalSatang)}</p></article>)}
   {!bill.data.closed && bill.data.status==='OPEN' && <div className="grid gap-2 sm:grid-cols-2"><Link className="flex min-h-12 items-center justify-center bg-brand-action px-4 font-bold text-white" to={`/pos?tableBill=${billId}&tableName=${encodeURIComponent(bill.data.tableName)}`}>เพิ่มอาหารให้โต๊ะ</Link><button disabled={action.isPending} className="min-h-12 border border-brand-action bg-white px-4 font-bold text-brand-action" onClick={() => action.mutate(r=>r.checkout(billId,true))}>คิดเงิน / หยุดรับรายการ</button></div>}
   {!bill.data.closed && bill.data.status==='CHECKOUT' && <><p className="border border-amber-300 bg-amber-50 p-3 text-sm">หยุดรับรายการเพิ่มแล้ว ตรวจบิลก่อนรับชำระ</p><BillPayment key={billId} bill={bill.data} shopId={shopId} /><button disabled={action.isPending} className="min-h-12 border border-line bg-white px-4" onClick={() => action.mutate(r=>r.checkout(billId,false))}>กลับไปเปิดรับรายการ</button></>}
   {bill.data.payment && <div className="border border-green-300 bg-green-50 p-4 text-green-800"><p className="font-bold">รับชำระแล้ว · {bill.data.payment.method==='CASH' ? 'เงินสด' : 'เงินโอน'}</p><p>รับ {diningMoney(bill.data.payment.receivedSatang)} · ทอน {diningMoney(bill.data.payment.changeSatang)}</p></div>}
   {!bill.data.closed && <><button disabled={action.isPending || bill.data.pendingCount>0} className="min-h-12 border border-line bg-white px-4 disabled:opacity-40" onClick={() => setConfirmClose(true)}>ปิดโต๊ะ{bill.data.pendingCount>0 ? ' · ยังมีอาหารค้าง' : ''}</button>{confirmClose && <div className="grid gap-3 border border-line bg-white p-4"><p>ยืนยันปิดรอบโต๊ะนี้?</p><div className="grid grid-cols-2 gap-2"><button className="border border-line px-3" onClick={() => setConfirmClose(false)}>ย้อนกลับ</button><button disabled={action.isPending} className="bg-red-700 px-3 font-bold text-white" onClick={() => action.mutate(r=>r.close(billId),{onSuccess:onBack})}>ยืนยันปิดโต๊ะ</button></div></div>}</>}
  </section>}
  {action.error && <p role="alert" className="mt-3 text-red-700">{diningError(action.error)}</p>}
 </FormWorkspace>
}
function BillPayment({ bill, shopId }: { bill: DiningBill; shopId: string }) {
 const action = useDiningAction(shopId)
 const [method,setMethod] = useState<'CASH'|'BANK_TRANSFER'>('BANK_TRANSFER')
 const [amount,setAmount] = useState('')
 const request = useRef({ key:'',id:crypto.randomUUID() })
 const received = method==='BANK_TRANSFER' ? bill.totalSatang : Math.round(Number(amount)*100)
 const valid = Number.isSafeInteger(received) && received>=bill.totalSatang && received<=2147483647
 return <form className="grid min-w-0 gap-3 border border-green-300 bg-white p-4" onSubmit={e=>{
  e.preventDefault();if(!valid||action.isPending)return
  const key=method+':'+received
  if(request.current.key!==key)request.current={key,id:crypto.randomUUID()}
  action.mutate(r=>r.pay({billId:bill.id,method,receivedSatang:received,requestId:request.current.id,fingerprint:bill.fingerprint}))
 }}>
  <h3 className="font-bold">รับชำระรวมทั้งโต๊ะ</h3>
  <label className="grid min-w-0 gap-1 text-sm">วิธีชำระ<select disabled={action.isPending} className="min-w-0 border border-line px-3" value={method} onChange={e=>setMethod(e.target.value as typeof method)}><option value="BANK_TRANSFER">เงินโอน</option><option value="CASH">เงินสด</option></select></label>
  {method==='CASH' && <label className="grid min-w-0 gap-1 text-sm">ยอดรับเงิน (บาท)<input className="w-full min-w-0 border border-line px-3" type="number" min={bill.totalSatang/100} step="0.01" required value={amount} disabled={action.isPending} onChange={e=>setAmount(e.target.value)} /></label>}
  <p className="font-bold">ยอดบิล {diningMoney(bill.totalSatang)}{method==='CASH'&&valid ? ` · ทอน ${diningMoney(received-bill.totalSatang)}` : ''}</p>
  <button disabled={!valid||action.isPending} className="min-h-12 bg-green-700 px-4 font-bold text-white disabled:opacity-40">{action.isPending ? 'กำลังรับชำระ…' : 'ยืนยันรับชำระทั้งโต๊ะ'}</button>
  {action.error && <p role="alert" className="text-sm text-red-700">{diningError(action.error)}</p>}
 </form>
}
