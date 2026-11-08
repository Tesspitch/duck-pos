import { QuantityStepper } from '../../../../shared/presentation/QuantityStepper'
import { useMemo, useState } from 'react'
import { ProductSheet } from '../../../../shared/presentation/ProductSheet'
import { Icon } from '../../../../shared/presentation/Icon'

import { useCartStore } from '../../application/cart-store'
import type { PublicMenuProduct } from '../../domain/public-menu'
import { priceSelectedOptions } from '../../../../shared/domain/option-pricing'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

export function PublicProductCard({ product, priority = false }: { product: PublicMenuProduct; priority?: boolean }) {
  const addLine = useCartStore((state) => state.addLine)
  const [expanded, setExpanded] = useState(false)
  const [added, setAdded] = useState(false)
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

  function choose(groupId: string, optionId: string, selectionMode: 'SINGLE' | 'MULTIPLE') {
    setSelected((current) => {
      const values = current[groupId] ?? []
      if (selectionMode === 'SINGLE') return { ...current, [groupId]: [optionId] }
      if (values.includes(optionId)) return { ...current, [groupId]: values.filter((id) => id !== optionId) }
      return { ...current, [groupId]: [...values, optionId] }
    })
  }

  function add() {
    if (!product.isAvailable || !valid || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return
    addLine({
      key: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      basePriceSatang: product.basePriceSatang,
      quantity,
      note: note.trim(),
      options: selectedOptions.map((option) => ({ id: option.id, name: option.name, priceDeltaSatang: option.priceDeltaSatang })),
    })
    setSelected({})
    setQuantity(1)
    setNote('')
    setAdded(true)
    setExpanded(false)
  }

  return (
    <article className="food-card">
      <button type="button" className="food-card-trigger" disabled={!product.isAvailable} onClick={() => setExpanded(true)} aria-label={`เลือก ${product.name}`}>
      {product.imageUrl ? <img src={product.imageUrl} alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} className="food-card-image" /> : <span className="food-card-placeholder" aria-hidden="true"><Icon name="cutlery" size={30}/></span>}
      <span className="food-card-info"><span className="food-card-name">{product.name}</span>{product.description&&<span className="mt-1 line-clamp-2 text-xs text-muted">{product.description}</span>}<span className="food-card-bottom"><strong>{money(product.basePriceSatang)}</strong><span className="food-card-add" aria-hidden="true">{product.isAvailable ? <Icon name="plus"/> : <span className="px-2 text-xs">หมด</span>}</span></span></span>
      </button>
      {added && <p role="status" className="px-2 pb-2 text-xs text-green-800">เพิ่มลงตะกร้าแล้ว ✓</p>}
      {expanded && <ProductSheet title={product.name} imageUrl={product.imageUrl} className="customer-product-sheet" onClose={() => setExpanded(false)} actions={product.isAvailable&&<div className="quantity-and-action"><QuantityStepper value={quantity} onChange={setQuantity} showLabel={false}/><button type="button" disabled={!valid} onClick={add} className="min-h-11 rounded-xl bg-brand-action px-4 font-semibold text-white disabled:opacity-50">เพิ่มลงตะกร้า</button></div>}>
      {product.description && <p className="text-sm text-muted">{product.description}</p>}
        <div className="mt-4 grid gap-3">
        {!valid && <p className="text-sm text-brand-action">กรุณาเลือกตัวเลือกที่จำเป็นให้ครบตามจำนวนที่กำหนด</p>}
        {product.isAvailable ? product.optionGroups.map((group) => (
          <fieldset key={group.id} className="grid gap-2 rounded-xl bg-brand-soft p-3">
            <legend className="px-1 text-sm font-semibold">{group.name} · {group.selectionMode === 'SINGLE' ? 'เลือกได้อันเดียว' : 'เลือกได้หลายอัน'} · {group.isRequired ? 'จำเป็น' : 'ไม่บังคับ'}</legend>
            {group.pricingMode === 'FIRST_FREE_THEN_FIXED' ? <p className="text-xs font-medium text-brand-action">รายการแรกฟรี · รายการถัดไป +{money(group.additionalSelectionPriceSatang)}</p> : null}
            {group.selectionMode === 'SINGLE' && !group.isRequired ? <label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name={`public-${product.id}-${group.id}`} checked={(selected[group.id] ?? []).length === 0} onChange={() => setSelected((current) => ({ ...current, [group.id]: [] }))} />ไม่เลือก</label> : null}
            {group.options.map((option) => (
              <label key={option.id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2"><input type={group.selectionMode === 'SINGLE' ? 'radio' : 'checkbox'} name={group.selectionMode === 'SINGLE' ? `public-${product.id}-${group.id}` : undefined} disabled={!option.isAvailable} checked={(selected[group.id] ?? []).includes(option.id)} onChange={() => choose(group.id, option.id, group.selectionMode)} />{option.name}</span>
                <span>{option.isAvailable ? (group.pricingMode === 'PER_TOPPING' ? `+${money(option.priceDeltaSatang)}` : '') : 'หมด'}</span>
              </label>
            ))}
          </fieldset>
        )) : null}
        {product.isAvailable ? <label className="grid gap-1 text-sm">หมายเหตุ<input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} className="rounded-lg border border-line px-3" placeholder="เช่น ไม่ใส่หอม" /></label> : null}
        </div>
        </ProductSheet>}
    </article>
  )
}
