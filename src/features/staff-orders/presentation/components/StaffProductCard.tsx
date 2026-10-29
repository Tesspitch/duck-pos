import { useMemo, useState } from 'react'

import type { Product } from '../../../catalog/domain/catalog'
import { usePosCartStore } from '../../application/pos-cart-store'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

export function StaffProductCard({ product }: { product: Product }) {
  const addLine = usePosCartStore((state) => state.addLine)
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const selectedOptions = useMemo(() => product.optionGroups.flatMap((group) =>
    group.options.filter((option) => (selected[group.id] ?? []).includes(option.id))), [product.optionGroups, selected])
  const valid = product.optionGroups.every((group) => {
    const count = (selected[group.id] ?? []).length
    return count >= group.minSelect && count <= group.maxSelect
  })

  function toggle(groupId: string, optionId: string, maxSelect: number) {
    setSelected((current) => {
      const values = current[groupId] ?? []
      if (values.includes(optionId)) return { ...current, [groupId]: values.filter((id) => id !== optionId) }
      if (values.length >= maxSelect) return current
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

  if (!expanded) {
    return (
      <button type="button" disabled={!product.isAvailable} onClick={() => setExpanded(true)}
        className="min-h-28 rounded-2xl border border-line bg-white p-4 text-left disabled:bg-gray-100 disabled:text-muted">
        <span className="block font-bold">{product.name}</span>
        <span className="mt-2 block font-bold text-brand-action">{money(product.basePriceSatang)}</span>
        {!product.isAvailable ? <span className="mt-1 block text-sm font-semibold text-red-700">สินค้าหมด</span> : null}
      </button>
    )
  }

  return (
    <article className="col-span-full rounded-2xl border-2 border-brand bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-bold">{product.name}</h3><p className="text-brand-action">{money(product.basePriceSatang)}</p></div>
        <button type="button" onClick={() => setExpanded(false)} className="rounded-lg border border-line px-3">ปิด</button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {product.optionGroups.map((group) => (
          <fieldset key={group.id} className="rounded-xl bg-brand-soft p-3">
            <legend className="px-1 font-semibold">{group.name} · {group.minSelect}–{group.maxSelect}</legend>
            {group.options.map((option) => (
              <label key={option.id} className="flex min-h-11 items-center justify-between gap-3">
                <span className="flex items-center gap-2"><input type="checkbox" disabled={!option.isAvailable}
                  checked={(selected[group.id] ?? []).includes(option.id)}
                  onChange={() => toggle(group.id, option.id, group.maxSelect)} />{option.name}</span>
                <span>{option.isAvailable ? `+${money(option.priceDeltaSatang)}` : 'หมด'}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <label className="mt-3 grid gap-1 text-sm">หมายเหตุรายการ
        <input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)}
          className="rounded-lg border border-line px-3" placeholder="เช่น ไม่ใส่หอม" />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="font-medium">จำนวน
          <input type="number" min={1} max={20} value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.min(20, Number(event.target.value))))}
            className="ml-2 w-20 rounded-lg border border-line px-2" />
        </label>
        <button type="button" disabled={!valid} onClick={add}
          className="rounded-xl bg-brand-action px-5 font-semibold text-white disabled:opacity-50">เพิ่มลงตะกร้า</button>
      </div>
    </article>
  )
}

