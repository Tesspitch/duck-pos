import { Icon } from './Icon'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveShop } from '../../features/shop-context/application/active-shop-context'

export function BranchSwitcher({ onSwitch }: { onSwitch?: () => void }) {
  const navigate = useNavigate()
  const { activeMembership, memberships, selectShop } = useActiveShop()
  const dialog = useRef<HTMLDialogElement>(null)
  const [requested, setRequested] = useState('')
  const target = memberships.find((membership) => membership.shop_id === requested)
  if (!memberships.length) return null
  function cancel() { dialog.current?.close(); setRequested('') }
  function confirm() {
    if (!target) return
    selectShop(target.shop_id)
    cancel()
    onSwitch?.()
    navigate('/', { replace: true })
  }
  return <>
    <label className="branch-switcher"><span><Icon name="store" /> สาขาของคุณ</span><select aria-label="เลือกร้านหรือสาขา" value={activeMembership?.shop_id ?? ''} onChange={(event) => {
      if (event.target.value === activeMembership?.shop_id) return
      setRequested(event.target.value)
      dialog.current?.showModal()
    }}>{memberships.map((membership) => <option key={membership.shop_id} value={membership.shop_id}>{membership.shops?.name ?? membership.shop_id}</option>)}</select></label>
    <dialog ref={dialog} aria-label="ยืนยันเปลี่ยนสาขา" className="confirm-action-dialog" onCancel={() => setRequested('')}>
      <span aria-hidden="true" className="branch-dialog-icon"><Icon name="store" /></span>
      <h2 className="mt-3 text-xl font-bold">เปลี่ยนสาขา?</h2>
      <p className="mt-3 text-sm text-muted">{activeMembership?.shops?.name ?? 'สาขาปัจจุบัน'} → <strong className="text-ink">{target?.shops?.name ?? requested}</strong></p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" autoFocus onClick={cancel} className="border border-line px-4">อยู่สาขาเดิม</button><button type="button" disabled={!target} onClick={confirm} className="bg-brand-action px-4 font-bold text-white disabled:opacity-50">ยืนยันเปลี่ยน</button></div>
    </dialog>
  </>
}
