import { useState } from 'react'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'
import { ItemActions } from '../../../../shared/presentation/ItemActions'

import { formatThaiBaht } from '../../../catalog/domain/money'
import type { SaveToppingInput, Topping, ToppingGroup, ToppingMenuCategory } from '../../domain/topping-library'
import { ToppingForm } from './ToppingForm'

interface Props {
  shopId: string
  group: ToppingGroup
  categories: ToppingMenuCategory[]
  isOwner: boolean
  busy: boolean
  onEditGroup: (group: ToppingGroup) => void
  onDeleteGroup: (group: ToppingGroup) => void
  onSaveTopping: (input: SaveToppingInput) => Promise<void>
  onDeleteTopping: (topping: Topping) => void
  onToggleAvailability: (topping: Topping) => void
}

export function ToppingGroupCard({ shopId, group, categories, isOwner, busy, onEditGroup, onDeleteGroup, onSaveTopping, onDeleteTopping, onToggleAvailability }: Props) {
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null)
  const [creating, setCreating] = useState(false)
  const categoryNames = group.categoryIds.map((id) => categories.find((category) => category.id === id)?.name).filter(Boolean)
  const selectionLabel = group.selectionMode === 'SINGLE' ? 'เลือกได้อันเดียว' : 'เลือกได้หลายอัน'
  const pricingLabel = group.pricingMode === 'FIRST_FREE_THEN_FIXED'
    ? `รายการแรกฟรี · รายการถัดไป +${formatThaiBaht(group.additionalSelectionPriceSatang)}`
    : 'คิดราคาตามแต่ละรายการ'

  return <article className="rounded-2xl border border-line bg-white p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 break-words"><h2 className="text-lg font-bold">{group.name}</h2><p className="text-sm text-muted">{selectionLabel} · {group.isRequired ? 'จำเป็นต้องเลือก' : 'ไม่บังคับ'} · {group.isVisible ? 'แสดงอยู่' : 'ซ่อนอยู่'}</p><p className="mt-1 text-xs font-medium text-brand-action">{pricingLabel}</p></div>
      {isOwner && <ItemActions name={`หมวดท็อปปิง ${group.name}`} disabled={busy} onEdit={() => onEditGroup(group)} onDelete={() => onDeleteGroup(group)} />}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{categoryNames.map((name) => <span key={name} className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold">{name}</span>)}</div>
    <div className="mt-4 grid gap-2">
      {group.toppings.length === 0 ? <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">ยังไม่มีท็อปปิงในหมวดนี้</p> : null}
      {group.toppings.map((topping) => <div key={topping.id} className="rounded-lg border border-line bg-neutral-50 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 break-words"><p className={`font-semibold ${topping.isAvailable ? '' : 'text-muted line-through'}`}>{topping.name}</p><p className="text-muted">{group.pricingMode === 'FIRST_FREE_THEN_FIXED' ? 'ใช้ราคาตามกฎของหมวด' : (topping.priceDeltaSatang > 0 ? `+${formatThaiBaht(topping.priceDeltaSatang)}` : 'ไม่เพิ่มราคา')} · {topping.isVisible ? 'แสดง' : 'ซ่อน'}</p></div>
          {isOwner && <ItemActions name={`ท็อปปิง ${topping.name}`} disabled={busy} onEdit={() => setEditingTopping(topping)} onDelete={() => onDeleteTopping(topping)} />}
        </div>
        <button type="button" disabled={busy} aria-label={`${topping.isAvailable ? 'ปิดขาย' : 'เปิดขาย'}ท็อปปิง ${topping.name}`} onClick={() => onToggleAvailability(topping)} className="mt-2 min-h-11 rounded-lg border border-line bg-white px-3 font-semibold disabled:opacity-50">{topping.isAvailable ? 'ปิดขาย' : 'เปิดขาย'}</button>
      </div>)}
    </div>
    {isOwner && <button type="button" disabled={busy} onClick={() => setCreating(true)} className="mt-4 border border-brand-action bg-brand-soft px-4 font-semibold text-brand-action disabled:opacity-50">＋ เพิ่มท็อปปิง</button>}
    {isOwner && (creating || editingTopping) ? <FormWorkspace title={`${editingTopping ? 'แก้ไข' : 'เพิ่ม'}ท็อปปิง · ${group.name}`} busy={busy} onBack={() => { setEditingTopping(null); setCreating(false) }}><ToppingForm key={editingTopping?.id ?? `new-${group.id}`} shopId={shopId} groupId={group.id} topping={editingTopping} pricingMode={group.pricingMode} busy={busy} onCancel={() => { setEditingTopping(null); setCreating(false) }} onSave={async (input) => { await onSaveTopping(input); setEditingTopping(null); setCreating(false) }} /></FormWorkspace> : null}
  </article>
}
