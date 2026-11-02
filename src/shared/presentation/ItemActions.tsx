import { useEffect, useId, useRef, useState } from 'react'

export function ItemActions({ name, disabled = false, onEdit, onDelete }: { name: string; disabled?: boolean; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  function choose(action: () => void) { setOpen(false); trigger.current?.focus(); action() }
  return <div ref={root} className="item-actions">
    <button ref={trigger} type="button" disabled={disabled} aria-label={`ตัวเลือก ${name}`} aria-expanded={open} aria-controls={id} className="item-actions-trigger" onClick={() => setOpen(!open)}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg></button>
    {open && <div id={id} className="item-actions-panel"><button type="button" disabled={disabled} onClick={() => choose(onEdit)}>แก้ไข</button><button type="button" disabled={disabled} onClick={() => choose(onDelete)} className="text-red-700">ลบ</button></div>}
  </div>
}
