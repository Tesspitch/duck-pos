import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'
import { grantFormSchema } from '../../application/grant-form-schema'
import { usePlatformAdminRepository } from '../../application/platform-admin-repository-context'
import type { PlatformShopStaff } from '../../application/platform-admin-repository'
import type { PlatformShop } from '../../domain/platform-shop'

const errors: Record<string,string> = {
  'Target user does not exist.': 'ไม่พบผู้ใช้ กรุณาให้พนักงานเข้าสู่ระบบก่อนส่งรหัสผู้ใช้',
  'User already has shop access or is an owner.': 'ผู้ใช้นี้มีสิทธิ์ในร้านอยู่แล้ว',
  'Platform administrator access required.': 'ต้องใช้สิทธิ์ผู้ดูแลระบบ',
  'Active staff membership not found.': 'ผู้ใช้นี้ไม่มีสิทธิ์พนักงานในร้านแล้ว',
  'Invalid staff change.': 'ไม่สามารถถอนสิทธิ์พนักงานของบัญชีตัวเองได้',
  'Shop not found.': 'ไม่พบร้านหรือร้านถูกลบแล้ว',
}

export function PlatformShopStaffPanel({shop,onBack}:{shop:PlatformShop;onBack:()=>void}) {
  const repository = usePlatformAdminRepository()
  const client = useQueryClient()
  const [userId,setUserId] = useState('')
  const [remove,setRemove] = useState<PlatformShopStaff|null>(null)
  const [feedback,setFeedback] = useState('')
  const [invalid,setInvalid] = useState(false)
  const queryKey = ['platform-shop-staff',shop.id] as const
  const staff = useQuery({queryKey,queryFn:()=>repository.listShopStaff(shop.id)})
  const change = useMutation({
    mutationFn:({id,active}:{id:string;active:boolean})=>repository.setShopStaff(shop.id,id,active),
    onSuccess:async (_, {active})=>{
      if(active)setUserId('')
      setRemove(null)
      setFeedback(active?'เพิ่มพนักงานแล้ว':'ถอนสิทธิ์พนักงานแล้ว')
      await Promise.all([client.invalidateQueries({queryKey}),client.invalidateQueries({queryKey:['memberships']})])
    },
  })
  const error = change.error && (errors[change.error.message] ?? 'ทำรายการไม่สำเร็จ กรุณาลองใหม่')
  return <FormWorkspace title={`พนักงาน · ${shop.name}`} busy={change.isPending} onBack={onBack}>
    <form className="pos-summary-card grid gap-3" onSubmit={event=>{
      event.preventDefault()
      if(change.isPending||remove)return
      setFeedback('');change.reset()
      const parsed=grantFormSchema.safeParse({userId:userId.trim()})
      setInvalid(!parsed.success)
      if(parsed.success)change.mutate({id:parsed.data.userId,active:true})
    }}>
      <h2 className="font-bold">เพิ่มพนักงาน</h2>
      <label className="grid gap-1 text-sm">รหัสผู้ใช้ (User ID)<input value={userId} disabled={change.isPending} onChange={event=>setUserId(event.target.value)} required maxLength={36} autoComplete="off" className="rounded-lg border border-line px-3"/></label>
      {invalid&&<p role="alert" className="text-sm text-red-700">กรุณากรอกรหัสผู้ใช้ให้ถูกต้อง</p>}
      <button type="submit" disabled={change.isPending||!!remove} className="rounded-lg bg-brand-action px-4 font-bold text-white disabled:opacity-50">เพิ่มพนักงาน</button>
    </form>
    {error&&<p role="alert" className="my-3 text-sm text-red-700">{error}</p>}
    {feedback&&<p role="status" className="my-3 text-sm text-green-800">{feedback}</p>}
    <section className="pos-summary-card mt-4"><h2 className="font-bold">พนักงานที่มีสิทธิ์ใช้งาน</h2>
      {staff.isPending&&<p role="status">กำลังโหลดพนักงาน…</p>}
      {staff.isError&&<p role="alert">โหลดพนักงานไม่สำเร็จ <button type="button" className="underline" onClick={()=>void staff.refetch()}>ลองใหม่</button></p>}
      {staff.data?.length===0&&<p className="mt-2 text-sm text-muted">ยังไม่มีพนักงานในร้านนี้</p>}
      <ul className="divide-y divide-line">{staff.data?.map(person=><li key={person.userId} className="flex flex-wrap items-center justify-between gap-2 py-3"><div className="min-w-0"><strong className="break-words">{person.name??person.email??'บัญชี DuckPOS'}</strong><p className="break-all text-xs text-muted">{person.email??person.userId}</p></div><button type="button" disabled={change.isPending} onClick={()=>{setFeedback('');change.reset();setRemove(person)}} className="rounded-lg border border-red-200 px-3 text-sm text-red-800">ถอนสิทธิ์</button></li>)}</ul>
    </section>
    {remove&&<section className="pos-summary-card mt-4 border-red-200" aria-label="ยืนยันถอนสิทธิ์พนักงาน"><p className="break-words font-bold">ถอนสิทธิ์ {remove.name??remove.email??remove.userId} จาก {shop.name}?</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={change.isPending} onClick={()=>{setRemove(null);change.reset()}} className="rounded-lg border border-line">ยกเลิก</button><button type="button" disabled={change.isPending} onClick={()=>change.mutate({id:remove.userId,active:false})} className="rounded-lg bg-red-700 font-bold text-white">ยืนยันถอนสิทธิ์</button></div></section>}
  </FormWorkspace>
}
