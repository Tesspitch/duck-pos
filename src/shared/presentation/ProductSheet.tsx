import { useEffect, useId, useRef, type PropsWithChildren } from 'react'
import { Icon } from './Icon'

export function ProductSheet({ title, onClose, children }: PropsWithChildren<{ title: string; onClose: () => void }>) {
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
  return <dialog ref={dialog} className="product-sheet" aria-labelledby={titleId} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="product-sheet-surface"><header className="product-sheet-header"><h2 id={titleId}>{title}</h2><button autoFocus type="button" aria-label="ปิดตัวเลือกสินค้า" onClick={onClose}><Icon name="close" /></button></header><div className="product-sheet-content">{children}</div></div>
  </dialog>
}
