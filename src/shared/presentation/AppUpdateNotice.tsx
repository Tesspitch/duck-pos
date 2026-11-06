import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import type { AppUpdates } from '../application/app-updates'
import { browserAppUpdates } from '../infrastructure/browser-app-updates'
import { preserveUpdateDrafts } from '../application/preserve-update-drafts'
import { getUpdateSafetyRevision,subscribeUpdateSafety,trackUpdateSafety,updateBlockReason } from '../application/update-safety'
import { Icon } from './Icon'

export function AppUpdateNotice({service=browserAppUpdates,enabled=import.meta.env.PROD}:{service?:AppUpdates;enabled?:boolean}) {
  const state=useSyncExternalStore(service.subscribe,service.getSnapshot)
  useSyncExternalStore(subscribeUpdateSafety,getUpdateSafetyRevision)
  const client=useQueryClient()
  const mutating=useIsMutating()>0
  const [dismissed,setDismissed]=useState(false)
  const [error,setError]=useState('')
  const applying=useRef(false)
  useEffect(()=>{if(!enabled)return;const stop=service.start(),stopSafety=trackUpdateSafety();return ()=>{stop();stopSafety()}},[enabled,service])
  if(!enabled||!state.available)return null
  const reason=updateBlockReason(mutating)
  async function update(){
    if(applying.current||updateBlockReason(client.isMutating()>0))return
    applying.current=true;setError('')
    try{preserveUpdateDrafts();await service.apply()}
    catch{setError('ยังเก็บตะกร้าในเครื่องไม่ได้ กรุณาลองใหม่ก่อนอัปเดต')}
    finally{applying.current=false}
  }
  if(dismissed&&!state.applying)return <button className="app-update-chip" onClick={()=>setDismissed(false)}><Icon name="refresh"/> มีอัปเดต</button>
  return <>
    <aside className="app-update-notice" aria-label="อัปเดตแอป" role="status" aria-live="polite">
      <div><strong>มีเวอร์ชันใหม่</strong><p>{reason??'ตะกร้าจะยังอยู่หลังอัปเดต'}</p>{(error||state.error)&&<p role="alert">{error||state.error}</p>}</div>
      <button disabled={!!reason||state.applying} className="app-update-primary" onClick={()=>void update()}>{state.applying?'กำลังอัปเดต…':'อัปเดต'}</button>
      <button disabled={state.applying} className="app-update-later" onClick={()=>setDismissed(true)}>ไว้ก่อน</button>
    </aside>
    {state.applying&&<UpdateProgress/>}
  </>
}
function UpdateProgress(){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const element=dialog.current;element?.showModal();return ()=>element?.close()},[])
  return <dialog ref={dialog} className="confirm-action-dialog" aria-label="กำลังอัปเดตแอป" aria-busy="true" onCancel={event=>event.preventDefault()}><p className="flex items-center gap-3 font-bold"><span className="mutation-spinner"/>กำลังอัปเดตแอป…</p></dialog>
}
