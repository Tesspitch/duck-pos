import { useMemo, useState } from 'react'
import { ProductSheet } from '../../../../shared/presentation/ProductSheet'
import { QuantityStepper } from '../../../../shared/presentation/QuantityStepper'

import type { Product } from '../../../catalog/domain/catalog'
import { usePosCartStore } from '../../application/pos-cart-store'
import { priceSelectedOptions } from '../../../../shared/domain/option-pricing'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

export function StaffProductCard({ product }: { product: Product }) {
  const addLine = usePosCartStore((state) => state.addLine)
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const selectedOptions = useMemo(
    () => priceSelectedOptions(product.optionGroups, selected),
    [product.optionGroups, selected],
  )
  const valid = product.optionGroups.every((group) => {
    const count = (selected[group.id] ?? []).length
    return count >= group.minSelect && count <= group.maxSelect
  })
  const total = (product.basePriceSatang + selectedOptions.reduce((sum, option) => sum + option.priceDeltaSatang, 0)) * quantity

  function choose(groupId: string, optionId: string, selectionMode: 'SINGLE' | 'MULTIPLE') {
    setSelected((current) => {
      const values = current[groupId] ?? []
      if (selectionMode === 'SINGLE') return { ...current, [groupId]: [optionId] }
      if (values.includes(optionId)) return { ...current, [groupId]: values.filter((id) => id !== optionId) }
      return { ...current, [groupId]: [...values, optionId] }
    })
  }

  function add() {
    if (!product.isAvailable || !valid) return
    addLine({
      key: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      basePriceSatang: product.basePriceSatang,
      quantity,
      note: note.trim(),
      options: selectedOptions.map((option) => ({
        id: option.id, name: option.name, priceDeltaSatang: option.priceDeltaSatang,
      })),
    })
    setExpanded(false)
    setSelected({})
    setQuantity(1)
    setNote('')
  }

  return <>
      <button type="button" disabled={!product.isAvailable} onClick={() => setExpanded(true)}
        className="food-card food-card-trigger staff-product-card disabled:opacity-50">
        {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" className="food-card-image" /> : <span aria-hidden="true" className="food-card-placeholder">เมนูของร้าน</span>}
        <span className="food-card-info">
        <span className="staff-product-name">{product.name}</span>
        {product.description && <span className="staff-product-description">{product.description}</span>}
        <span className="product-tile-price"><span>{money(product.basePriceSatang)}</span><span aria-hidden="true">+</span></span>
        {product.optionGroups.length > 0 && <span className="block text-xs text-muted">{product.optionGroups.length} กลุ่มตัวเลือก</span>}
        {!product.isAvailable ? <span className="mt-1 block text-sm font-semibold text-red-700">สินค้าหมด</span> : null}
        </span>
      </button>
      {expanded && <ProductSheet title={product.name} className="staff-product-sheet" onClose={() => setExpanded(false)}>
      <div className="staff-product-detail">
        {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-24 w-24 shrink-0 rounded object-cover" />}
        <div className="min-w-0"><p className="text-xl font-bold text-brand-action">{money(product.basePriceSatang)}</p>{product.description && <p className="mt-2 whitespace-pre-line break-words text-sm text-ink">{product.description}</p>}</div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {product.optionGroups.map((group) => (
          <fieldset key={group.id} className="staff-option-group min-w-0 rounded border border-line p-3">
            <legend className="px-1 font-semibold">{group.name} · {group.selectionMode === 'SINGLE' ? 'เลือกได้อันเดียว' : 'เลือกได้หลายอัน'} · {group.isRequired ? 'จำเป็น' : 'ไม่บังคับ'}</legend>
            {group.pricingMode === 'FIRST_FREE_THEN_FIXED' ? <p className="text-xs font-medium text-brand-action">รายการแรกฟรี · รายการถัดไป +{money(group.additionalSelectionPriceSatang)}</p> : null}
            {group.selectionMode === 'SINGLE' && !group.isRequired ? <label className="flex min-h-11 items-center gap-2"><input type="radio" name={`staff-${product.id}-${group.id}`} checked={(selected[group.id] ?? []).length === 0} onChange={() => setSelected((current) => ({ ...current, [group.id]: [] }))} />ไม่เลือก</label> : null}
            {group.options.map((option) => (
              <label key={option.id} className={`staff-option-row ${selected[group.id]?.includes(option.id) ? 'selected' : ''}`}>
                <span className="flex min-w-0 items-center gap-2"><input type={group.selectionMode === 'SINGLE' ? 'radio' : 'checkbox'} name={group.selectionMode === 'SINGLE' ? `staff-${product.id}-${group.id}` : undefined} disabled={!option.isAvailable}
                  checked={(selected[group.id] ?? []).includes(option.id)}
                  onChange={() => choose(group.id, option.id, group.selectionMode)} /><span className="break-words">{option.name}</span></span>
                <span className="shrink-0 font-semibold">{option.isAvailable ? (group.pricingMode === 'PER_TOPPING' ? `+${money(option.priceDeltaSatang)}` : '') : 'หมด'}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <label className="mt-3 grid gap-1 text-sm">หมายเหตุรายการ
        <input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)}
          className="rounded-lg border border-line px-3" placeholder="เช่น ไม่ใส่หอม" />
      </label>
      <div className="staff-product-footer">
        {!valid && <p className="w-full text-sm font-medium text-brand-action">เลือกตัวเลือกที่จำเป็นให้ครบ</p>}
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button type="button" disabled={!valid} onClick={add}
          className="min-h-12 flex-1 rounded bg-brand-action px-4 font-semibold text-white disabled:opacity-50">เพิ่ม · {money(total)}</button>
      </div>
    </ProductSheet>}
  </>
}

