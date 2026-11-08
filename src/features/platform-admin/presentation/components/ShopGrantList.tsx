import { useState } from 'react'
import { Icon } from '../../../../shared/presentation/Icon'
import type { ShopCreationGrant, ShopCreationGrantStatus } from '../../domain/shop-creation-grant'

interface ShopGrantListProps {
  grants: ShopCreationGrant[]
  loading: boolean
  failed: boolean
  onRetry: () => void
  onRevoke: (userId: string) => void
}

const statuses: Record<ShopCreationGrantStatus, { label: string; tone: string }> = {
  ACTIVE: { label: 'ใช้สิทธิ์ได้', tone: 'bg-green-50 text-green-800' },
  CONSUMED: { label: 'ใช้สร้างร้านแล้ว', tone: 'bg-brand-soft text-brand-action' },
  REVOKED: { label: 'ถอนสิทธิ์แล้ว', tone: 'bg-gray-100 text-gray-700' },
}
const pageSize = 10
const dateFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' })

export function ShopGrantList({ grants, loading, failed, onRetry, onRevoke }: ShopGrantListProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ShopCreationGrantStatus | ''>('')
  const [page, setPage] = useState(0)
  const term = search.trim().toLocaleLowerCase()
  const filtered = grants.filter((grant) => (
    (!status || grant.status === status) &&
    [grant.user_id, grant.user_profiles?.display_name, grant.user_profiles?.email].some(value => value?.toLocaleLowerCase().includes(term))
  ))
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1))
  const start = currentPage * pageSize
  const visible = filtered.slice(start, start + pageSize)

  return <section className="overflow-hidden rounded-2xl border border-line bg-white" aria-labelledby="platform-grants-heading">
    <header className="border-b border-line p-4">
      <h2 id="platform-grants-heading" className="text-lg font-bold">ผู้ได้รับสิทธิ์สร้างร้าน</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-w-0 items-center gap-2 rounded-xl border border-line px-3 text-muted">
          <Icon name="search" className="shrink-0"/><span className="sr-only">ค้นหาผู้ใช้</span>
          <input className="w-full min-w-0" type="search" placeholder="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้" value={search} onChange={event=>{setSearch(event.target.value);setPage(0)}}/>
        </label>
        <select aria-label="สถานะสิทธิ์" className="min-w-0 rounded-xl border border-line px-3" value={status} onChange={event=>{setStatus(event.target.value as typeof status);setPage(0)}}>
          <option value="">ทุกสถานะ</option>
          {Object.entries(statuses).map(([value,{label}])=><option key={value} value={value}>{label}</option>)}
        </select>
      </div>
    </header>
    {loading&&<p role="status" className="p-4 text-muted">กำลังโหลดสิทธิ์สร้างร้าน…</p>}
    {failed&&<p role="alert" className="p-4 text-red-700">โหลดรายการสิทธิ์ไม่สำเร็จ <button type="button" onClick={onRetry} className="underline">ลองใหม่</button></p>}
    {!loading&&!failed&&visible.length===0&&<p className="p-6 text-center text-muted">{grants.length?'ไม่พบผู้ใช้ตามตัวกรอง':'ยังไม่มีรายการสิทธิ์สร้างร้าน'}</p>}
    {visible.length>0&&<>
      <div className="platform-grant-row platform-grant-columns" aria-hidden="true"><span>บัญชีผู้ใช้</span><span>สถานะสิทธิ์</span><span>วันที่อนุมัติ</span><span>การจัดการ</span></div>
      <ul className="divide-y divide-line">
        {visible.map(grant=>{
          const name = grant.user_profiles?.display_name || grant.user_profiles?.email || 'บัญชี DuckPOS'
          const state = statuses[grant.status]
          return <li key={grant.id} className="platform-grant-row">
            <div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand-action" aria-hidden="true">{name.slice(0,1).toLocaleUpperCase()}</span>
              <div className="min-w-0"><p className="break-words font-semibold">{name}</p>{grant.user_profiles?.email&&grant.user_profiles.email!==name&&<p className="break-all text-sm text-muted">{grant.user_profiles.email}</p>}<p className="break-all text-xs text-muted">{grant.user_id}</p></div>
            </div>
            <div><span className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold ${state.tone}`}><span className="size-2 rounded-full bg-current" aria-hidden="true"/>{state.label}</span></div>
            <p className="text-sm text-muted"><span className="xl:hidden">อนุมัติ </span>{dateFormat.format(new Date(grant.granted_at))}</p>
            <div>{grant.status==='ACTIVE'&&<button type="button" onClick={()=>onRevoke(grant.user_id)} className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-800 hover:bg-red-50">ถอนสิทธิ์</button>}</div>
          </li>
        })}
      </ul>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-4 text-sm text-muted">
        <p>แสดง {start+1}–{start+visible.length} จาก {filtered.length} รายการ</p>
        <div className="pos-chips"><button type="button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>ก่อนหน้า</button><button type="button" disabled={start+pageSize>=filtered.length} onClick={()=>setPage(currentPage+1)}>ถัดไป</button></div>
      </footer>
    </>}
  </section>
}

