import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'
import { usePlatformAdminRepository } from '../../application/platform-admin-repository-context'
import type { PlatformShop } from '../../domain/platform-shop'

const errors: Record<string,string> = {
  'Pending or unpaid orders must be resolved before closing the store.': 'ยังมีอาหารหรือยอดรับชำระค้าง สามารถหยุดรับออเดอร์ใหม่ระหว่างรอพนักงานเคลียร์รายการได้',
  'Close active dining tables before closing the store.': 'ยังมีโต๊ะเปิดอยู่ กรุณาให้พนักงานปิดบิลโต๊ะก่อน หรือหยุดรับออเดอร์ใหม่ไว้ก่อน',
  'The active store session changed on another device.': 'รอบขายเปลี่ยนแล้ว กรุณาโหลดรายการร้านใหม่',
  'The store is already closed.': 'ร้านปิดแล้ว กรุณาโหลดรายการร้านใหม่',
}
export function ClosePlatformShop({shop,onBack}:{shop:PlatformShop;onBack:()=>void}) {
  const repository=usePlatformAdminRepository()
  const client=useQueryClient()
  const [message,setMessage]=useState('')
  const action=useMutation({
    mutationFn:(pause:boolean)=>pause?repository.pauseShop(shop.id,shop.activeSessionId!):repository.closeShop(shop.id,shop.activeSessionId!),
    onSuccess:async(_,pause)=>{
      await Promise.all(['platform-shops','store-management','staff-orders','public-menu','dining-context','dining-round','dining-tables','sales-dashboard','sales-history'].map(key=>client.invalidateQueries({queryKey:['platform-shops','dining-context','dining-round'].includes(key)?[key]:[key,shop.id]})))
      if(pause)setMessage('หยุดรับออเดอร์ใหม่แล้ว พนักงานยังเคลียร์รายการเดิมได้')
      else onBack()
    },
    onError:()=>{void client.invalidateQueries({queryKey:['platform-shops']})},
  })
  return <FormWorkspace title="ปิดร้านค้า" busy={action.isPending} onBack={onBack}>
    <section className="grid min-w-0 gap-4 border border-line bg-white p-4">
      <h2 className="break-words text-xl font-bold">{shop.name}</h2>
      <p className="text-sm text-muted">ปิดรอบขายได้เมื่อไม่มีออเดอร์ ยอดชำระ หรือโต๊ะค้าง</p>
      <button disabled={action.isPending||!!message} className="min-h-12 bg-red-700 px-4 font-bold text-white disabled:opacity-40" onClick={()=>action.mutate(false)}>{action.isPending&&action.variables===false?'กำลังปิดร้าน…':'ยืนยันปิดรอบขาย'}</button>
      {shop.acceptingOrders&&!message&&<button disabled={action.isPending} className="min-h-12 border border-amber-500 bg-amber-50 px-4 font-bold text-amber-900" onClick={()=>action.mutate(true)}>{action.isPending&&action.variables===true?'กำลังหยุดรับ…':'หยุดรับออเดอร์ใหม่แทน'}</button>}
      {message&&<p role="status" className="border border-green-300 bg-green-50 p-3 text-green-800">{message}</p>}
      {action.error&&<p role="alert" className="border border-red-200 bg-red-50 p-3 text-red-800">{errors[action.error.message]??'ทำรายการไม่สำเร็จ กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่'}</p>}
    </section>
  </FormWorkspace>
}
