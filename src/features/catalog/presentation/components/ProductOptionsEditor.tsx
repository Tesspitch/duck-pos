import { useState } from 'react'

import type {
  OptionGroup,
  Product,
  ProductOption,
  SaveOptionGroupInput,
  SaveProductOptionInput,
} from '../../domain/catalog'
import { formatThaiBaht } from '../../domain/money'
import { OptionGroupForm } from './OptionGroupForm'
import { ProductOptionForm } from './ProductOptionForm'

interface ProductOptionsEditorProps {
  shopId: string
  product: Product
  busy: boolean
  onClose: () => void
  onSaveGroup: (input: SaveOptionGroupInput) => Promise<void>
  onDeleteGroup: (groupId: string) => Promise<void>
  onSaveOption: (input: SaveProductOptionInput) => Promise<void>
  onDeleteOption: (optionId: string) => Promise<void>
}

export function ProductOptionsEditor({
  shopId,
  product,
  busy,
  onClose,
  onSaveGroup,
  onDeleteGroup,
  onSaveOption,
  onDeleteOption,
}: ProductOptionsEditorProps) {
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null)
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null)

  return (
    <section className="grid gap-4 rounded-2xl border border-brand bg-brand-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-brand-action">ตัวเลือก/ท็อปปิง</p><h2 className="text-xl font-bold">{product.name}</h2></div>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-white px-3">ปิด</button>
      </div>
      <OptionGroupForm key={editingGroup?.id ?? 'new-group'} shopId={shopId} productId={product.id} group={editingGroup} busy={busy} onCancel={() => setEditingGroup(null)} onSave={async (input) => { await onSaveGroup(input); setEditingGroup(null) }} />
      {product.optionGroups.map((group) => (
        <article key={group.id} className="rounded-xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-bold">{group.name}</h3><p className="text-sm text-muted">เลือก {group.minSelect}–{group.maxSelect} · {group.isVisible ? 'แสดงอยู่' : 'ซ่อนอยู่'}</p></div>
            <div className="flex gap-2"><button type="button" onClick={() => setEditingGroup(group)} className="rounded-lg border border-line px-3 text-sm">แก้ไข</button><button type="button" onClick={() => { if (window.confirm('ลบกลุ่มและตัวเลือกทั้งหมดในกลุ่มนี้?')) void onDeleteGroup(group.id) }} className="rounded-lg border border-red-200 px-3 text-sm text-red-700">ลบ</button></div>
          </div>
          <div className="mt-3 grid gap-2">
            {group.options.map((option) => (
              <div key={option.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
                <span>{option.name} {option.priceDeltaSatang > 0 ? `+${formatThaiBaht(option.priceDeltaSatang)}` : ''}</span>
                <div className="flex gap-2"><button type="button" onClick={() => setEditingOption(option)} className="min-h-9 rounded-md border border-line px-2">แก้ไข</button><button type="button" onClick={() => { if (window.confirm('ลบตัวเลือกนี้?')) void onDeleteOption(option.id) }} className="min-h-9 rounded-md border border-red-200 px-2 text-red-700">ลบ</button></div>
              </div>
            ))}
          </div>
          <ProductOptionForm key={editingOption?.optionGroupId === group.id ? editingOption.id : `new-option-${group.id}`} shopId={shopId} optionGroupId={group.id} option={editingOption?.optionGroupId === group.id ? editingOption : null} busy={busy} onCancel={() => setEditingOption(null)} onSave={async (input) => { await onSaveOption(input); setEditingOption(null) }} />
        </article>
      ))}
    </section>
  )
}
