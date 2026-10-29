import { useState } from 'react'

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
  const categoryNames = group.categoryIds.map((id) => categories.find((category) => category.id === id)?.name).filter(Boolean)
  const selectionLabel = group.selectionMode === 'SINGLE' ? 'เลือกได้อันเดียว' : 'เลือกได้หลายอัน'
  const pricingLabel = group.pricingMode === 'FIRST_FREE_THEN_FIXED'
    ? `รายการแรกฟรี · รายการถัดไป +${formatThaiBaht(group.additionalSelectionPriceSatang)}`
    : 'คิดราคาตามแต่ละรายการ'

  return <article className="rounded-2xl border border-line bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold">{group.name}</h2><p className="text-sm text-muted">{selectionLabel} · {group.isRequired ? 'จำเป็นต้องเลือก' : 'ไม่บังคับ'} · {group.isVisible ? 'แสดงอยู่' : 'ซ่อนอยู่'}</p><p className="mt-1 text-xs font-medium text-brand-action">{pricingLabel}</p></div>
      {isOwner ? <div className="flex gap-2"><button type="button" onClick={() => onEditGroup(group)} className="rounded-lg border border-line px-3 text-sm">แก้ไขหมวด</button><button type="button" onClick={() => onDeleteGroup(group)} className="rounded-lg border border-red-200 px-3 text-sm text-red-700">ลบหมวด</button></div> : null}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{categoryNames.map((name) => <span key={name} className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold">{name}</span>)}</div>
    <div className="mt-4 grid gap-2">
      {group.toppings.length === 0 ? <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">ยังไม่มีท็อปปิงในหมวดนี้</p> : null}
      {group.toppings.map((topping) => <div key={topping.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 p-3 text-sm">
        <div><p className={`font-semibold ${topping.isAvailable ? '' : 'text-muted line-through'}`}>{topping.name}</p><p className="text-muted">{group.pricingMode === 'FIRST_FREE_THEN_FIXED' ? 'ใช้ราคาตามกฎของหมวด' : (topping.priceDeltaSatang > 0 ? `+${formatThaiBaht(topping.priceDeltaSatang)}` : 'ไม่เพิ่มราคา')} · {topping.isVisible ? 'แสดง' : 'ซ่อน'}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => onToggleAvailability(topping)} className="min-h-9 rounded-lg border border-line bg-white px-3 disabled:opacity-50">{topping.isAvailable ? 'ปิดขาย' : 'เปิดขาย'}</button>{isOwner ? <><button type="button" onClick={() => setEditingTopping(topping)} className="min-h-9 rounded-lg border border-line bg-white px-3">แก้ไข</button><button type="button" onClick={() => onDeleteTopping(topping)} className="min-h-9 rounded-lg border border-red-200 bg-white px-3 text-red-700">ลบ</button></> : null}</div>
      </div>)}
    </div>
    {isOwner ? <ToppingForm key={editingTopping?.id ?? `new-${group.id}`} shopId={shopId} groupId={group.id} topping={editingTopping} pricingMode={group.pricingMode} busy={busy} onCancel={() => setEditingTopping(null)} onSave={async (input) => { await onSaveTopping(input); setEditingTopping(null) }} /> : null}
  </article>
}
