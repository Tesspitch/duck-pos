import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { getPaymentQr } from '../infrastructure/payment-qr-repository'
import { Icon } from '../../../shared/presentation/Icon'
import { optimizePaymentQr, paymentQrError } from '../infrastructure/optimize-payment-qr'
export function PaymentQrSettings({shopId}:{shopId:string}) {
 const client=useQueryClient()
 const qr=useQuery({queryKey:['payment-qr',shopId],queryFn:()=>getPaymentQr(shopId),enabled:!!shopId})
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [fileName,setFileName]=useState('')
 async function upload(file:File) {
  setBusy(true);setMessage('')
  try {
   const optimized=await optimizePaymentQr(file)
   const path=`${shopId}/payment/${crypto.randomUUID()}.${optimized.type==='image/png'?'png':optimized.type==='image/jpeg'?'jpg':'webp'}`
   const uploaded=await supabase.storage.from('shop-assets').upload(path,optimized,{upsert:false,contentType:optimized.type});if(uploaded.error)throw uploaded.error
   const saved=await supabase.from('shop_payment_qr').upsert({shop_id:shopId,image_path:path});if(saved.error){await supabase.storage.from('shop-assets').remove([path]);throw saved.error}
   await client.invalidateQueries({queryKey:['payment-qr',shopId]});setMessage('บันทึก QR รับเงินแล้ว')
  }catch(error){setMessage(paymentQrError(error))}finally{setBusy(false)}
 }
 return <section className="mt-6 grid min-w-0 gap-3 border border-line bg-white p-4">
  <h2 className="font-bold">QR รับเงินธนาคาร</h2>
  <p className="text-sm text-muted">ใช้ QR รับเงินแบบไม่ระบุยอด สำหรับแสดงบนบิล</p>
  {qr.data&&<div className="flex justify-center border border-line bg-white p-4"><img src={qr.data} alt="QR รับเงินของร้าน" className="h-auto w-full max-w-56"/></div>}
  <label className={`relative flex min-w-0 flex-col items-center gap-3 border-2 border-dashed border-orange-400 bg-brand-soft p-5 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-orange-600 ${busy?'opacity-60':'cursor-pointer hover:border-orange-600'}`}>
   <span className="flex h-12 w-12 items-center justify-center border border-orange-200 bg-white text-brand-action"><Icon name="qr" size={28}/></span>
   <strong className="text-sm">{qr.data?'เปลี่ยนรูป QR รับเงิน':'อัปโหลดรูป QR รับเงิน'}</strong>
   <span className="flex min-h-11 items-center justify-center gap-2 bg-brand-action px-5 text-sm font-bold text-white"><Icon name="plus" size={18}/>{busy?'กำลังอัปโหลด…':'เลือกรูปภาพ'}</span>
   <span className="text-xs text-muted">PNG, JPG หรือ WebP · ระบบปรับรูปที่เกิน 2 MB ให้อัตโนมัติ</span>
   {fileName&&<span className="w-full min-w-0 break-all text-sm font-medium">{fileName}</span>}
   <input aria-label="อัปโหลดรูป QR รับเงิน" disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file){setFileName(file.name);void upload(file)}e.target.value=''}}/>
  </label>
  {busy&&<p role="status">กำลังปรับรูปและบันทึก…</p>}{message&&<p role="status">{message}</p>}{qr.error&&<p role="alert">{paymentQrError(qr.error)} <button className="underline" onClick={()=>void qr.refetch()}>ลองโหลดใหม่</button></p>}
 </section>
}
