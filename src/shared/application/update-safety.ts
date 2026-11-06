const listeners=new Set<()=>void>()
const dirtyForms=new Set<HTMLFormElement>()
let tasks=0
let revision=0
const changed=()=>{revision++;listeners.forEach(listener=>listener())}
export const subscribeUpdateSafety=(listener:()=>void)=>{listeners.add(listener);return ()=>{listeners.delete(listener)}}
export const getUpdateSafetyRevision=()=>revision

/** Includes the location request before TanStack Query starts its mutation. */
export function beginCriticalTask(){
  tasks++;changed()
  let finished=false
  return ()=>{if(!finished){finished=true;tasks--;changed()}}
}
export function updateBlockReason(mutating:boolean):string|null {
  if(tasks||mutating)return 'รอให้ส่งออเดอร์หรือบันทึกข้อมูลเสร็จก่อน'
  if(document.querySelector('dialog[open]'))return 'ปิดหน้าที่กำลังทำรายการก่อนอัปเดต'
  if([...dirtyForms].some(form=>form.isConnected))return 'บันทึกงานแล้วเปลี่ยนหน้าก่อนอัปเดต'
  return null
}
export function trackUpdateSafety(){
  const edit=(event:Event)=>{
    const target=event.target
    if(!(target instanceof HTMLElement))return
    if(target instanceof HTMLInputElement&&target.type==='search')return
    const form=target.closest('form')
    if(form&&!dirtyForms.has(form)){dirtyForms.add(form);changed()}
  }
  let hasDialog=Boolean(document.querySelector('dialog[open]'))
  const observer=new MutationObserver(()=>{
    let removed=false
    for(const form of dirtyForms)if(!form.isConnected){dirtyForms.delete(form);removed=true}
    const nextDialog=Boolean(document.querySelector('dialog[open]'))
    if(removed||hasDialog!==nextDialog){hasDialog=nextDialog;changed()}
  })
  document.addEventListener('input',edit,true)
  document.addEventListener('change',edit,true)
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']})
  return ()=>{document.removeEventListener('input',edit,true);document.removeEventListener('change',edit,true);observer.disconnect();dirtyForms.clear();changed()}
}
