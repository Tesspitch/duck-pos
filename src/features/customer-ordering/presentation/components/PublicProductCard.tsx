import { useMemo, useState } from 'react'

import { useCartStore } from '../../application/cart-store'
import type { PublicMenuProduct } from '../../domain/public-menu'
import { priceSelectedOptions } from '../../../../shared/domain/option-pricing'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

export function PublicProductCard({ product, priority = false }: { product: PublicMenuProduct; priority?: boolean }) {
  const addLine = useCartStore((state) => state.addLine)
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
    if (!product.isAvailable || !valid) return
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
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white">
      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} className="h-44 w-full object-cover" /> : null}
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-bold">{product.name}</h3>{product.description ? <p className="mt-1 text-sm text-muted">{product.description}</p> : null}</div>
          <p className="whitespace-nowrap font-bold text-brand-action">{money(product.basePriceSatang)}</p>
        </div>
        {!product.isAvailable ? <p className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">สินค้าหมด</p> : null}
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
        {product.isAvailable ? <div className="flex items-center justify-between gap-3"><label className="text-sm font-medium">จำนวน <input type="number" min={1} max={20} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(20, Number(event.target.value))))} className="ml-2 w-20 rounded-lg border border-line px-2" /></label><button type="button" disabled={!valid} onClick={add} className="min-h-11 rounded-xl bg-brand-action px-4 font-semibold text-white disabled:opacity-50">เพิ่มลงตะกร้า</button></div> : null}
      </div>
    </article>
  )
}
