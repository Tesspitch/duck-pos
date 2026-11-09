import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveShop } from '../../features/shop-context/application/active-shop-context'
import { Icon } from './Icon'

export function BranchSwitcher({ onSwitch }: { onSwitch?: () => void }) {
  const navigate = useNavigate()
  const { activeMembership, memberships, selectShop } = useActiveShop()
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const [requested, setRequested] = useState('')
  const target = memberships.find((membership) => membership.shop_id === requested)

  useEffect(() => {
    if (target) cancelButton.current?.focus()
  }, [target])

  if (!memberships.length) return null
  const currentName = activeMembership?.shops?.name ?? activeMembership?.shop_id ?? 'เลือกสาขา'
  const branchIdentity = <>
    <span className="branch-icon"><Icon name="store" /></span>
    <span className="branch-label"><small>สาขาปัจจุบัน</small><strong>{currentName}</strong></span>
  </>

  function cancel() { dialog.current?.close(); setRequested('') }
  function confirm() {
    if (!target) return
    selectShop(target.shop_id)
    cancel()
    onSwitch?.()
    navigate('/', { replace: true })
  }
  return <>
    {memberships.length > 1
      ? <button type="button" className="branch-switcher" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        {branchIdentity}
        <Icon name="switch" size={18} />
        <span className="sr-only">เปลี่ยนสาขา</span>
      </button>
      : <div className="branch-switcher">{branchIdentity}</div>}
    <dialog ref={dialog} aria-labelledby={titleId} className="confirm-action-dialog branch-picker" onClose={() => setRequested('')}>
      <header className="branch-picker-header">
        <h2 id={titleId}>{target ? 'ยืนยันเปลี่ยนสาขา' : 'เลือกสาขา'}</h2>
        <button type="button" autoFocus className="branch-picker-close" aria-label="ปิดหน้าต่างเลือกสาขา" onClick={cancel}><Icon name="close" /></button>
      </header>
      {target ? <>
        <div className="branch-change-summary">
          <span>{currentName}</span>
          <Icon name="arrow" size={18} />
          <strong>{target.shops?.name ?? target.shop_id}</strong>
        </div>
        <div className="branch-picker-actions">
          <button type="button" ref={cancelButton} onClick={cancel}>อยู่สาขาเดิม</button>
          <button type="button" onClick={confirm}>ยืนยันเปลี่ยน</button>
        </div>
      </> : <ul className="branch-options">
        {memberships.map((membership) => {
          const name = membership.shops?.name ?? membership.shop_id
          return <li key={membership.shop_id}>
            {membership.shop_id === activeMembership?.shop_id
              ? <div className="branch-option is-current" aria-current="true"><span className="branch-icon"><Icon name="store" /></span><strong>{name}<small>กำลังใช้งาน</small></strong><Icon name="check" size={18} /></div>
              : <button type="button" className="branch-option" onClick={() => setRequested(membership.shop_id)}><span className="branch-icon"><Icon name="store" /></span><strong>{name}</strong><Icon name="arrow" size={18} /></button>}
          </li>
        })}
      </ul>}
    </dialog>
  </>
}
