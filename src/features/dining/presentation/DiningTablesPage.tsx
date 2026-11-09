import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppShell } from '../../../shared/presentation/AppShell'
import { Icon } from '../../../shared/presentation/Icon'
import { FormWorkspace } from '../../../shared/presentation/FormWorkspace'
import { useActiveShop } from '../../shop-context/application/active-shop-context'
import { useQrCodeService } from '../../shop-qr/application/use-qr-code-service'
import { useDiningAction, useDiningTables } from '../application/use-dining'
import { billLabels, diningError, diningMoney, type DiningTable } from '../domain/dining'
import { TableBillPanel } from './TableBillPanel'
import { createTableQrPoster, tablePosterPng } from '../infrastructure/table-qr-poster'

export function DiningTablesPage() {
 const { activeMembership }=useActiveShop()
 const shopId=activeMembership?.shop_id ?? ''
 return <AppShell><DiningWorkspace key={shopId} shopId={shopId} owner={activeMembership?.role==='OWNER'} /></AppShell>
}
function DiningWorkspace({shopId,owner}:{shopId:string;owner:boolean}) {
 const tables=useDiningTables(shopId)
 const action=useDiningAction(shopId)
 const [params,setParams]=useSearchParams()
 const [adding,setAdding]=useState(false)
 const [name,setName]=useState('')
 const [opening,setOpening]=useState<DiningTable|null>(null)
 const [deleting,setDeleting]=useState<DiningTable|null>(null)
 const [qr,setQr]=useState<DiningTable|null>(null)
 const bill=params.get('bill')
 return <main className="mx-auto grid w-full min-w-0 max-w-6xl gap-5 p-4 sm:p-6">
  <header className="flex flex-wrap justify-between gap-3"><div><p className="page-eyebrow">ทานที่ร้าน</p><h1 className="text-2xl font-bold"><Icon name="store" /> โต๊ะและบิล</h1></div><div className="flex gap-2"><button className="border border-line bg-white px-3" onClick={()=>void tables.refetch()}>รีเฟรช</button>{owner&&<button className="bg-brand-action px-4 font-bold text-white" onClick={()=>setAdding(true)}>เพิ่มโต๊ะ</button>}</div></header>
  <p className="text-sm text-muted">ลูกค้าสแกนสั่งได้เลย · เปิดบิลอัตโนมัติเมื่อส่งออเดอร์แรก</p>
  {tables.isPending&&<p role="status">กำลังโหลดโต๊ะ…</p>}
  {(tables.error||(!deleting&&action.error))&&<p role="alert" className="text-red-700">{diningError(tables.error??action.error)}</p>}
  {tables.data?.length===0&&<p className="border border-dashed border-line p-6 text-center text-muted">{owner?'เพิ่มโต๊ะแล้วดาวน์โหลด QR สำหรับวางที่โต๊ะ':'ยังไม่มีโต๊ะ กรุณาให้เจ้าของร้านเพิ่มโต๊ะ'}</p>}
  <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {tables.data?.map(table => <article key={table.id} className={`min-w-0 border bg-white p-4 ${table.status==='AVAILABLE'?'border-line':table.status==='CHECKOUT'?'border-amber-400':'border-green-500'}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 break-words text-xl font-bold">{table.name}</h2>
        <div className="flex shrink-0 gap-2">
          <button className="border border-line px-3" aria-label={`QR ${table.name}`} onClick={()=>setQr(table)}><Icon name="qr" /></button>
          {owner && <button type="button" className="grid min-h-11 min-w-11 place-items-center border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40"
            aria-label={`ลบโต๊ะ ${table.name}`} title={table.billId ? 'กรุณาปิดรอบโต๊ะก่อนลบโต๊ะ' : 'ลบโต๊ะ'}
            disabled={Boolean(table.billId) || action.isPending} onClick={() => { action.reset(); setDeleting(table) }}><Icon name="trash" /></button>}
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold">{billLabels[table.status]}</p>
      <p className="mt-3 text-xl font-bold text-brand-action">{diningMoney(table.totalSatang)}</p>
      <button disabled={action.isPending} className={`mt-4 min-h-12 w-full px-4 font-bold ${table.billId?'bg-brand-action text-white':'border border-green-700 text-green-800'}`} onClick={()=>table.billId?setParams({bill:table.billId}):setOpening(table)}>{table.billId?'ดูรายการ / บิล':'เปิดบิลเอง'}</button>
    </article>)}
  </div>
  <Link to="/settings/qr" className="text-sm text-muted underline">QR หน้าร้าน / สั่งกลับบ้าน</Link>
  {bill&&<TableBillPanel key={bill} billId={bill} shopId={shopId} onBack={()=>setParams({})} />}
  {adding&&<FormWorkspace title="เพิ่มโต๊ะ" busy={action.isPending} onBack={()=>setAdding(false)}><form className="grid min-w-0 gap-4 border border-line bg-white p-4" onSubmit={e=>{e.preventDefault();action.mutate(r=>r.create(shopId,name.trim()),{onSuccess:()=>{setAdding(false);setName('')}})}}><label className="grid min-w-0 gap-1 text-sm">ชื่อโต๊ะ<input className="w-full min-w-0 border border-line px-3" value={name} maxLength={60} required onChange={e=>setName(e.target.value)} /></label><button disabled={action.isPending||!name.trim()} className="bg-brand-action px-4 font-bold text-white">{action.isPending?'กำลังเพิ่ม…':'บันทึกโต๊ะ'}</button>{action.error&&<p role="alert">{diningError(action.error)}</p>}</form></FormWorkspace>}
  {opening&&<FormWorkspace title={`เปิด ${opening.name}`} busy={action.isPending} onBack={()=>setOpening(null)}><div className="grid gap-4 border border-line bg-white p-4"><p>เริ่มรอบใหม่และรับรายการสั่งของ {opening.name}?</p><button disabled={action.isPending} className="min-h-12 bg-green-700 px-4 font-bold text-white" onClick={()=>action.mutate(r=>r.open(opening.id),{onSuccess:id=>{setOpening(null);setParams({bill:String(id)})}})}>{action.isPending?'กำลังเปิดโต๊ะ…':'ยืนยันเปิดโต๊ะ'}</button>{action.error&&<p role="alert">{diningError(action.error)}</p>}</div></FormWorkspace>}
  {qr&&<TableQr table={qr} onBack={()=>setQr(null)} />}
  {deleting && <FormWorkspace title={`ลบโต๊ะ ${deleting.name}`} busy={action.isPending} onBack={() => { action.reset(); setDeleting(null) }}>
    <div className="grid gap-4 border border-line bg-white p-4">
      <p>ลบโต๊ะนี้ออกจากรายการและยกเลิก QR ของโต๊ะนี้หรือไม่? ประวัติบิลยังเก็บไว้</p>
      <button type="button" disabled={action.isPending} className="min-h-12 bg-red-700 px-4 font-bold text-white disabled:opacity-50"
        onClick={() => action.mutate(repository => repository.archive(shopId, deleting.id), { onSuccess: () => setDeleting(null) })}>
        {action.isPending ? 'กำลังลบโต๊ะ…' : 'ยืนยันลบโต๊ะ'}
      </button>
      {action.error && <p role="alert" className="text-red-700">{diningError(action.error)}</p>}
    </div>
  </FormWorkspace>}
 </main>
}
function TableQr({table,onBack}:{table:DiningTable;onBack:()=>void}) {
 const qr=useQrCodeService()
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [preview,setPreview]=useState('')
 const url=window.location.origin+'/table/'+table.qrToken
 useEffect(()=>{
  let active=true
  void qr.createSvg(url).then(svg=>createTableQrPoster(table.name,svg)).then(svg=>{if(active)setPreview('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg))}).catch(()=>{if(active)setError('สร้าง QR ไม่สำเร็จ')})
  return ()=>{active=false}
 },[qr,url,table.name])
 async function download() {
  setBusy(true);setError('')
  try { const anchor=document.createElement('a');anchor.href=await tablePosterPng(preview);anchor.download='DuckPOS-'+table.name+'.png';anchor.click() }
  catch {setError('สร้าง QR ไม่สำเร็จ กรุณาลองใหม่')}
  finally {setBusy(false)}
 }
 return <FormWorkspace title={`QR ${table.name}`} busy={busy} onBack={onBack}><section className="grid gap-4 border border-line bg-white p-5"><h2 className="text-2xl font-bold">{table.name}</h2>{preview&&<img src={preview} alt={`QR ${table.name}`} width="1122" height="1402" className="mx-auto h-auto w-full max-w-md" />}<p className="break-all text-sm text-muted">{url}</p><a className="flex min-h-12 items-center justify-center border border-line px-4" href={url} target="_blank" rel="noreferrer">เปิดหน้าลูกค้า</a><button disabled={busy||!preview} className="min-h-12 bg-brand-action px-4 font-bold text-white" onClick={()=>void download()}>{busy?'กำลังสร้าง QR…':'ดาวน์โหลด QR โต๊ะ'}</button>{error&&<p role="alert">{error}</p>}</section></FormWorkspace>
}

