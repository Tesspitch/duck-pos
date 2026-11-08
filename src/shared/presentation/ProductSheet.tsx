import { useEffect, useId, useRef, type PropsWithChildren, type ReactNode } from 'react'
import { Icon } from './Icon'

export function ProductSheet({ title, onClose, children, className = '', imageUrl, actions }: PropsWithChildren<{ title: string; onClose: () => void; className?: string; imageUrl?: string | null; actions?: ReactNode }>) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = overflow; trigger?.focus() }
  }, [])
  return <dialog ref={dialog} className={`product-sheet ${className}`} aria-labelledby={titleId} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="product-sheet-surface">
      <header className="product-sheet-header"><div className="flex min-w-0 items-center gap-3">{imageUrl&&<img src={imageUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover"/>}<h2 id={titleId} className="min-w-0 break-words">{title}</h2></div><button autoFocus type="button" aria-label="ปิดตัวเลือกสินค้า" onClick={onClose}><Icon name="close" /></button></header>
      <div className="product-sheet-content">{children}</div>
      {actions&&<footer className="customer-product-actions">{actions}</footer>}
    </div>
  </dialog>
}
