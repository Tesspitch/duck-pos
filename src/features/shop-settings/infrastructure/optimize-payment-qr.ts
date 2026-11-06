export async function optimizePaymentQr(file:File):Promise<Blob> {
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('รองรับเฉพาะรูป PNG, JPG และ WebP')
 if(file.size<=2097152)return file
 const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('อ่านรูปไม่ได้ ไฟล์อาจเสียหาย กรุณาเลือกรูปใหม่')})
 try {
  for(const maxSide of [2400,1800,1400,1100]) {
   const ratio=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height))
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio))
   const context=canvas.getContext('2d');if(!context)throw new Error('เบราว์เซอร์นี้ไม่รองรับการปรับขนาดรูป')
   context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height)
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'))
   if(blob&&blob.size<=2097152)return blob
  }
  throw new Error('ปรับรูปแล้วแต่ยังเกิน 2 MB กรุณาครอปให้เหลือเฉพาะ QR แล้วลองใหม่')
 }finally{bitmap.close()}
}
export function paymentQrError(error:unknown) {
 const e=error as {message?:string;code?:string;statusCode?:string}
 const message=e?.message??''
 if(e?.code==='42P01'||e?.code==='PGRST205'||/shop_payment_qr.*schema cache|relation .*shop_payment_qr.*does not exist/i.test(message))return 'ยังไม่ได้ติดตั้งการตั้งค่า QR รับเงิน กรุณารัน migration 043 บน Supabase'
 if(e?.code==='42501'||/row.level security|permission denied|unauthorized/i.test(message))return 'ไม่มีสิทธิ์บันทึก QR กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของร้าน'
 if(/bucket.*not found/i.test(message))return 'ไม่พบพื้นที่เก็บรูป shop-assets กรุณาตรวจสอบการตั้งค่า Supabase Storage'
 if(/fetch|network|connection/i.test(message))return 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
 if(/size|too large|payload/i.test(message))return 'ไฟล์เกินขนาดที่พื้นที่เก็บรูปอนุญาต กรุณาตรวจสอบขนาดไฟล์และการตั้งค่า Storage'
 return message ? `บันทึกไม่สำเร็จ: ${message}` : 'บันทึกไม่สำเร็จ กรุณาลองใหม่'
}
