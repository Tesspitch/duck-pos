import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

export function SignOutConfirmation({email,onConfirm,onCancel}:{email?:string;onConfirm:()=>Promise<void>;onCancel:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null)
  const locked=useRef(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  useEffect(()=>{const element=dialog.current;element?.showModal();return ()=>element?.close()},[])
  async function confirm(){
    if(locked.current)return
    locked.current=true;setBusy(true);setError('')
    try{await onConfirm()}
    catch{setError('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง')}
    finally{locked.current=false;setBusy(false)}
  }
  return <dialog ref={dialog} className="confirm-action-dialog" aria-label="ยืนยันออกจากระบบ" aria-busy={busy} onCancel={event=>{event.preventDefault();if(!busy)onCancel()}}>
    <span className="branch-dialog-icon" aria-hidden="true"><Icon name="shield"/></span>
    <h2 className="mt-3 text-xl font-bold">ออกจากระบบ?</h2>
    {email&&<p className="mt-2 break-all text-sm text-muted">{email}</p>}
    <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" autoFocus disabled={busy} className="min-h-12 border border-line px-3" onClick={onCancel}>อยู่ต่อ</button><button type="button" disabled={busy} className="min-h-12 bg-red-700 px-3 font-bold text-white disabled:opacity-40" onClick={()=>void confirm()}>{busy?'กำลังออก…':'ยืนยันออกจากระบบ'}</button></div>
    {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </dialog>
}
