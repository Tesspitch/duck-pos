import { useMemo, useState } from 'react'

import { useCartStore } from '../../application/cart-store'
import type { PublicMenuProduct } from '../../domain/public-menu'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

export function PublicProductCard({ product }: { product: PublicMenuProduct }) {
  const addLine = useCartStore((state) => state.addLine)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const selectedOptions = useMemo(() => product.optionGroups.flatMap((group) => (
    group.options.filter((option) => (selected[group.id] ?? []).includes(option.id))
  )), [product.optionGroups, selected])
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
      options: selectedOptions.map((option) => ({ id: option.id, name: option.name, priceDeltaSatang: option.priceDeltaSatang })),
    })
    setSelected({})
    setQuantity(1)
    setNote('')
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white">
      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-44 w-full object-cover" /> : null}
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-bold">{product.name}</h3>{product.description ? <p className="mt-1 text-sm text-muted">{product.description}</p> : null}</div>
          <p className="whitespace-nowrap font-bold text-brand-action">{money(product.basePriceSatang)}</p>
        </div>
        {!product.isAvailable ? <p className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">สินค้าหมด</p> : null}
        {product.isAvailable ? product.optionGroups.map((group) => (
          <fieldset key={group.id} className="grid gap-2 rounded-xl bg-brand-soft p-3">
            <legend className="px-1 text-sm font-semibold">{group.name} · เลือก {group.minSelect}–{group.maxSelect}</legend>
            {group.options.map((option) => (
              <label key={option.id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2"><input type="checkbox" disabled={!option.isAvailable} checked={(selected[group.id] ?? []).includes(option.id)} onChange={() => toggle(group.id, option.id, group.maxSelect)} />{option.name}</span>
                <span>{option.isAvailable ? `+${money(option.priceDeltaSatang)}` : 'หมด'}</span>
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
