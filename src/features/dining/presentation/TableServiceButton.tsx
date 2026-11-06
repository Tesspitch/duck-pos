import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from '../../../shared/presentation/Icon'
import { requestService, serviceLabels, type ServiceType } from '../application/table-service'
const serviceIcons: Record<ServiceType, IconName> = { STAFF:'bell', BILL:'receipt', CUTLERY:'cutlery', CONDIMENTS:'toppings' }

export function TableServiceButton({ tableQrToken }: { tableQrToken: string }) {
 const [open, setOpen] = useState(false)
 const [busy, setBusy] = useState<ServiceType | null>(null)
 const [message, setMessage] = useState('')
 const [error, setError] = useState('')
 useEffect(()=>{if(!message)return;const timer=window.setTimeout(()=>setMessage(''),3000);return()=>window.clearTimeout(timer)},[message])
 async function send(type: ServiceType) {
  if (busy) return
  setBusy(type);setError('');setMessage('')
  try { await requestService(tableQrToken, type);setMessage(`ส่งคำขอ${serviceLabels[type]}แล้ว`);setOpen(false) }
  catch { setError('ส่งคำขอไม่สำเร็จ กรุณาลองอีกครั้งหรือติดต่อพนักงาน') }
  finally { setBusy(null) }
 }
 return <div>
  <button type="button" aria-label="เรียกพนักงาน" title="เรียกพนักงาน" className="flex min-h-11 min-w-11 items-center justify-center border border-brand-action bg-white text-brand-action" onClick={() => {setOpen(!open);setMessage('')}} aria-haspopup="dialog" aria-expanded={open}><Icon name="bell" size={22}/></button>
  {message && createPortal(<button type="button" role="status" onClick={()=>setMessage('')} className="fixed left-1/2 top-4 z-[210] -translate-x-1/2 border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-green-700 shadow-lg">{message}</button>,document.body)}
  {open && createPortal(<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={() => {if(!busy)setOpen(false)}}><section role="dialog" aria-modal="true" aria-labelledby="service-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto border border-line bg-white p-5 shadow-xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between gap-4"><h2 id="service-title" className="text-lg font-bold">ต้องการให้ช่วยอะไร?</h2><button type="button" className="flex min-h-11 min-w-11 items-center justify-center" aria-label="ปิด" disabled={!!busy} onClick={()=>setOpen(false)}><Icon name="close"/></button></div><div className="mt-4 grid grid-cols-2 gap-3">{(Object.keys(serviceLabels) as ServiceType[]).map(type=><button key={type} type="button" disabled={!!busy} onClick={()=>void send(type)} className="flex min-h-28 flex-col items-center justify-center gap-3 border border-line bg-white p-3 text-center font-semibold text-brand-action hover:border-brand-action hover:bg-brand-soft disabled:opacity-50"><Icon name={serviceIcons[type]} size={28}/><span>{busy===type?'กำลังส่ง…':serviceLabels[type]}</span></button>)}</div>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</section></div>,document.body)}
 </div>
}
