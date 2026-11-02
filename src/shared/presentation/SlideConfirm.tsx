import { Icon } from './Icon'
import { useRef, useState } from 'react'

interface Props { label: string; disabled?: boolean; intent?: 'open' | 'close'; onConfirm: () => Promise<void> }

export function SlideConfirm({ label, disabled = false, intent = 'open', onConfirm }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ pointerId: number; start: number; distance: number; value: number } | null>(null)
  const lock = useRef(false)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const blocked = disabled || running

  async function confirm() {
    if (disabled || lock.current) return
    lock.current = true
    setRunning(true)
    dialog.current?.close()
    try { await onConfirm() }
    finally { lock.current = false; setRunning(false); setProgress(0) }
  }

  return <div>
    <div ref={track} className={`slide-confirm intent-${intent} ${blocked ? 'is-disabled' : ''}`}>
      <span className="slide-confirm-label">{running ? 'กำลังดำเนินการ…' : `รูดเพื่อ${label} →`}</span>
      <button type="button" aria-label={`ยืนยัน${label}`} disabled={blocked} className="slide-confirm-handle" style={{ left: `calc(${progress * 100}% - ${progress * 52}px)` }}
        onPointerDown={(event) => {
          if (blocked || event.button !== 0) return
          const distance = (track.current?.clientWidth ?? 0) - 52
          if (distance <= 0) return
          drag.current = { pointerId: event.pointerId, start: event.clientX, distance, value: 0 }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const current = drag.current
          if (!current || current.pointerId !== event.pointerId) return
          current.value = Math.max(0, Math.min(1, (event.clientX - current.start) / current.distance))
          setProgress(current.value)
        }}
        onPointerUp={(event) => {
          const current = drag.current
          drag.current = null
          setProgress(0)
          if (current?.pointerId === event.pointerId && current.value >= .9 && !blocked) void confirm().catch(() => undefined)
        }}
        onPointerCancel={() => { drag.current = null; setProgress(0) }}
        onLostPointerCapture={() => { drag.current = null; setProgress(0) }}
        onClick={(event) => { if (event.detail === 0 && !blocked) dialog.current?.showModal() }}
      ><span aria-hidden="true"><Icon name="arrow" /></span></button>
    </div>
    <dialog ref={dialog} aria-label={`ยืนยัน${label}`} className={`confirm-action-dialog intent-${intent}`}><h2 className="text-xl font-bold">ยืนยัน{label}?</h2><p className="mt-2 text-sm text-muted">การดำเนินการนี้จะเปลี่ยนสถานะการรับออเดอร์ของร้าน</p><div className="mt-5 flex gap-3"><button type="button" onClick={() => dialog.current?.close()} className="flex-1 border border-line px-4">ยกเลิก</button><button type="button" disabled={blocked} onClick={() => void confirm().catch(() => undefined)} className="store-confirm-primary flex-1 px-4 font-bold text-white">ยืนยัน{label}</button></div></dialog>
  </div>
}
