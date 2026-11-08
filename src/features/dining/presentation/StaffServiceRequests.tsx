import { useState } from 'react'
import { Icon } from '../../../shared/presentation/Icon'
import { serviceLabels, useAcknowledgeService, useServiceRequests } from '../application/table-service'

export function StaffServiceRequests({ shopId }: { shopId: string }) {
 const requests=useServiceRequests(shopId)
 const acknowledge=useAcknowledgeService(shopId)
 const [open,setOpen]=useState(false)
 const count=requests.data?.length??0
 return <div className="relative">
  <button type="button" className="relative flex min-h-11 items-center gap-2 border border-line bg-white px-3 text-sm font-semibold" aria-expanded={open} aria-label={`คำขอจากโต๊ะ ${count} รายการ`} onClick={()=>setOpen(!open)}><Icon name="bell"/>{count>0&&<span className="bg-red-700 px-2 text-white">{count}</span>}</button>
  {open&&<section className="fixed inset-x-3 top-20 z-50 max-h-[70vh] overflow-y-auto border border-line bg-white p-4 rounded-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-96" aria-label="คำขอจากโต๊ะ"><div className="flex items-center justify-between"><h2 className="font-bold">คำขอจากโต๊ะ</h2><button aria-label="ปิดคำขอ" onClick={()=>setOpen(false)}><Icon name="close"/></button></div>{requests.isPending?<p className="mt-3">กำลังโหลด…</p>:requests.isError?<p role="alert" className="mt-3 text-red-700">โหลดคำขอไม่สำเร็จ <button className="underline" onClick={()=>void requests.refetch()}>ลองใหม่</button></p>:count===0?<p className="mt-3 text-sm text-muted">ยังไม่มีคำขอ</p>:<ul className="mt-3 grid gap-2">{requests.data?.map(item=><li key={item.id} className="flex items-center justify-between gap-2 border border-line p-3"><div><strong>{item.tableName}</strong><p>{serviceLabels[item.type]}</p><time className="text-xs text-muted">{new Date(item.createdAt).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</time></div><button disabled={acknowledge.isPending} className="min-h-11 border border-green-700 px-3 font-semibold text-green-700" onClick={()=>acknowledge.mutate(item.id)}>{acknowledge.isPending&&acknowledge.variables===item.id?'กำลังบันทึก…':'รับทราบ'}</button></li>)}</ul>}{acknowledge.isError&&<p role="alert" className="mt-2 text-red-700">บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง</p>}</section>}
 </div>
}
