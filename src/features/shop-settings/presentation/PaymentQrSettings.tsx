import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { getPaymentQr } from '../infrastructure/payment-qr-repository'
export function PaymentQrSettings({shopId}:{shopId:string}) {
 const client=useQueryClient()
 const qr=useQuery({queryKey:['payment-qr',shopId],queryFn:()=>getPaymentQr(shopId),enabled:!!shopId})
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 async function upload(file:File) {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2097152){setMessage('ใช้รูป PNG, JPG หรือ WebP ไม่เกิน 2 MB');return}
  setBusy(true);setMessage('')
  const path=`${shopId}/payment/${crypto.randomUUID()}.${file.type==='image/png'?'png':file.type==='image/jpeg'?'jpg':'webp'}`
  try {
   const uploaded=await supabase.storage.from('shop-assets').upload(path,file,{upsert:false,contentType:file.type});if(uploaded.error)throw uploaded.error
   const saved=await supabase.from('shop_payment_qr').upsert({shop_id:shopId,image_path:path});if(saved.error){await supabase.storage.from('shop-assets').remove([path]);throw saved.error}
   await client.invalidateQueries({queryKey:['payment-qr',shopId]});setMessage('บันทึก QR รับเงินแล้ว')
  }catch{setMessage('บันทึก QR ไม่สำเร็จ กรุณาลองใหม่')}finally{setBusy(false)}
 }
 return <section className="mt-6 grid min-w-0 gap-3 border border-line bg-white p-4"><h2 className="font-bold">QR รับเงินธนาคาร</h2><p className="text-sm text-muted">ใช้ QR รับเงินแบบไม่ระบุยอด สำหรับแสดงบนบิล</p>{qr.data&&<img src={qr.data} alt="QR รับเงินของร้าน" className="w-full max-w-56"/>}<label className="grid min-w-0 gap-2 text-sm">อัปโหลดรูป QR<input disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" className="w-full min-w-0 max-w-full" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file)}}/></label>{busy&&<p role="status">กำลังบันทึก…</p>}{message&&<p role="status">{message}</p>}{qr.error&&<p role="alert">โหลด QR ไม่สำเร็จ</p>}</section>
}
