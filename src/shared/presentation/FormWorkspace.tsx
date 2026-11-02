import { useEffect, useId, useRef, type PropsWithChildren } from 'react'
import { Icon } from './Icon'
import { MutationFeedback } from './MutationFeedback'

export function FormWorkspace({ title, busy = false, onBack, children }: PropsWithChildren<{ title: string; busy?: boolean; onBack: () => void }>) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = ref.current
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const scroll = window.scrollY
    const overflow = document.body.style.overflow
    element?.showModal()
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = overflow; window.scrollTo(0, scroll); trigger?.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} className="form-workspace" onCancel={(event) => { event.preventDefault(); if (!busy) onBack() }}>
    <MutationFeedback pendingOnly />
    <header className="form-workspace-bar"><button autoFocus type="button" disabled={busy} onClick={onBack}><Icon name="back" /> ย้อนกลับ</button><h1 id={titleId}>{title}</h1></header>
    <div className="form-workspace-content">{children}</div>
  </dialog>
}
