import { useContext, useEffect, useState } from 'react'
import { QueryClientContext, useMutationState } from '@tanstack/react-query'
import { Icon } from './Icon'

/** Mutation remains pending while its onSuccess cache refresh is awaited. */
export function MutationFeedback({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const client = useContext(QueryClientContext)
  return client ? <ObservedMutationFeedback pendingOnly={pendingOnly} /> : null
}

function ObservedMutationFeedback({ pendingOnly }: { pendingOnly: boolean }) {
  const mutations = useMutationState({ select: (mutation) => ({ status: mutation.state.status, submittedAt: mutation.state.submittedAt }) })
  const pending = mutations.filter((mutation) => mutation.status === 'pending')
  const latest = pending.at(-1) ?? mutations.filter((mutation) => mutation.submittedAt > 0).sort((a, b) => b.submittedAt - a.submittedAt).at(0)
  if (!latest || (pendingOnly && latest.status !== 'pending')) return null
  return <MutationNotice key={`${latest.submittedAt}-${latest.status}`} status={latest.status} />
}

function MutationNotice({ status }: { status: string }) {
  const [dismissed, setDismissed] = useState(false)
  const pending = status === 'pending'
  useEffect(() => {
    if (pending) return
    const timer = window.setTimeout(() => setDismissed(true), 5000)
    return () => window.clearTimeout(timer)
  }, [pending])
  if (dismissed || status === 'idle') return null
  return <div className={`mutation-feedback ${status}`} role={status === 'error' ? 'alert' : 'status'} aria-live={status === 'error' ? 'assertive' : 'polite'}>
    {pending ? <span className="mutation-spinner" aria-hidden="true" /> : <Icon name={status === 'error' ? 'close' : 'check'} />}
    <span>{pending ? 'กำลังทำรายการและอัปเดตข้อมูล…' : status === 'error' ? 'ทำรายการไม่สำเร็จ กรุณาลองใหม่' : 'ทำรายการสำเร็จ'}</span>
    {!pending && <button type="button" aria-label="ปิดการแจ้งผล" onClick={() => setDismissed(true)}><Icon name="close" size={16} /></button>}
  </div>
}
