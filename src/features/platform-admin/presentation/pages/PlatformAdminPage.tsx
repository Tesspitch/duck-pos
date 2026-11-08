import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../../../shared/presentation/Icon'
import { AppShell } from '../../../../shared/presentation/AppShell'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'
import { useShopCreationGrants } from '../../application/use-shop-creation-grants'
import { GrantShopForm } from '../components/GrantShopForm'
import { ShopGrantList } from '../components/ShopGrantList'
import { PlatformShopList } from '../components/PlatformShopList'

export function PlatformAdminPage() {
  const { grants, grant, revoke } = useShopCreationGrants()
  const [params,setParams] = useSearchParams()
  const section = params.get('view')==='shops'?'shops':'grants'
  function setSection(next:'grants'|'shops') { setParams(next==='shops'?{view:'shops'}:{}) }
  const [grantOpen, setGrantOpen] = useState(false)
  const [revokeUser, setRevokeUser] = useState<string | null>(null)
  const activeCount = grants.data?.filter((item) => item.status === 'ACTIVE').length

  return (
    <AppShell>
      <main className="platform-admin-page mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold text-brand-action">ผู้ดูแลระบบ</p>
          <h1 className="text-2xl font-bold"><Icon name="shield" /> จัดการแพลตฟอร์ม</h1>
          <p className="mt-1 text-sm text-muted">
            อนุมัติสิทธิ์สร้างร้านและดูแลร้านค้าบน DuckPOS
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:items-center">
          <div className="platform-admin-metric"><span><Icon name="users"/></span><div><p>รายการสิทธิ์ทั้งหมด</p><strong>{grants.data?.length??'—'}</strong></div></div>
          <div className="platform-admin-metric"><span className="platform-admin-metric-active"><Icon name="shield"/></span><div><p>สิทธิ์ที่ยังใช้ได้</p><strong>{activeCount??'—'}</strong></div></div>
          <button type="button" className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-action px-4 font-bold text-white lg:col-span-1" onClick={()=>{grant.reset();setGrantOpen(true)}}><Icon name="plus"/> อนุมัติสิทธิ์สร้างร้าน</button>
        </div>
        <nav aria-label="จัดการแพลตฟอร์ม" className="pos-chips my-5">
          <button type="button" aria-pressed={section==='grants'} onClick={()=>setSection('grants')}>สิทธิ์สร้างร้าน</button>
          <button type="button" aria-pressed={section==='shops'} onClick={()=>setSection('shops')}>ร้านค้าและพนักงาน</button>
        </nav>
        {section==='grants' ? <ShopGrantList
          grants={grants.data ?? []}
          loading={grants.isLoading}
          failed={grants.isError}
          onRetry={()=>void grants.refetch()}
          onRevoke={(userId)=>{revoke.reset();setRevokeUser(userId)}}
        /> : <PlatformShopList />}
        {grantOpen&&<FormWorkspace title="อนุมัติสิทธิ์สร้างร้าน" busy={grant.isPending} onBack={()=>setGrantOpen(false)}><GrantShopForm pending={grant.isPending} errorMessage={grant.error?.message} onGrant={(userId)=>grant.mutate(userId,{onSuccess:()=>{setGrantOpen(false);setSection('grants')}})}/></FormWorkspace>}
        {revokeUser&&<FormWorkspace title="ถอนสิทธิ์สร้างร้าน" busy={revoke.isPending} onBack={()=>setRevokeUser(null)}>
          <div className="pos-summary-card grid gap-3"><p>ถอนสิทธิ์สร้างร้านของผู้ใช้นี้?</p><p className="break-all text-sm text-muted">{revokeUser}</p>
            {revoke.isError&&<p role="alert" className="text-red-700">ถอนสิทธิ์ไม่สำเร็จ กรุณาลองใหม่</p>}
            <button type="button" disabled={revoke.isPending} className="rounded-xl bg-red-700 px-4 font-bold text-white disabled:opacity-50" onClick={()=>revoke.mutate(revokeUser,{onSuccess:()=>setRevokeUser(null)})}>{revoke.isPending?'กำลังถอนสิทธิ์…':'ยืนยันถอนสิทธิ์'}</button>
          </div>
        </FormWorkspace>}
      </main>
    </AppShell>
  )
}

