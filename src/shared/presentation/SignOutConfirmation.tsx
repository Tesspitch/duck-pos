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
  return <dialog ref={dialog} className="confirm-action-dialog signout-dialog" aria-labelledby="signout-title" aria-busy={busy} onCancel={event=>{event.preventDefault();if(!busy)onCancel()}}>
    <div className="signout-dialog-header"><span className="signout-icon" aria-hidden="true"><Icon name="logout" size={26}/></span><button type="button" className="signout-close" aria-label="ปิด" disabled={busy} onClick={onCancel}><Icon name="close"/></button></div>
    <h2 id="signout-title" className="mt-4 text-xl font-bold">ออกจากระบบ?</h2>
    {email&&<div className="signout-account"><Icon name="user" size={18}/><span>{email}</span></div>}
    <div className="signout-actions"><button type="button" autoFocus disabled={busy} className="signout-cancel" onClick={onCancel}>อยู่ต่อ</button><button type="button" disabled={busy} className="signout-confirm" onClick={()=>void confirm()}>{busy?'กำลังออก…':'ยืนยัน'}</button></div>
    {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </dialog>
}
