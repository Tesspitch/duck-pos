import { useState, type FormEvent } from 'react'

import { productOptionFormSchema } from '../../application/catalog-form-schemas'
import type { ProductOption, SaveProductOptionInput } from '../../domain/catalog'
import { satangToBahtText } from '../../domain/money'

interface ProductOptionFormProps {
  shopId: string
  optionGroupId: string
  option: ProductOption | null
  busy: boolean
  onCancel: () => void
  onSave: (input: SaveProductOptionInput) => Promise<void>
}

export function ProductOptionForm({ shopId, optionGroupId, option, busy, onCancel, onSave }: ProductOptionFormProps) {
  const [name, setName] = useState(option?.name ?? '')
  const [priceBaht, setPriceBaht] = useState(option ? satangToBahtText(option.priceDeltaSatang) : '0.00')
  const [sortOrder, setSortOrder] = useState(String(option?.sortOrder ?? 0))
  const [isVisible, setIsVisible] = useState(option?.isVisible ?? true)
  const [isAvailable, setIsAvailable] = useState(option?.isAvailable ?? true)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = productOptionFormSchema.safeParse({ name, priceBaht, sortOrder, isVisible, isAvailable })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }
    try {
      setError(null)
      await onSave({
        shopId,
        optionGroupId,
        id: option?.id,
        name: parsed.data.name,
        priceDeltaSatang: parsed.data.priceBaht,
        sortOrder: parsed.data.sortOrder,
        isVisible: parsed.data.isVisible,
        isAvailable: parsed.data.isAvailable,
      })
      if (!option) {
        setName('')
        setPriceBaht('0.00')
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกตัวเลือกไม่สำเร็จ')
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-3 grid gap-2 rounded-lg bg-neutral-50 p-3">
      <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">{option ? 'แก้ไขตัวเลือก' : 'เพิ่มตัวเลือก'}</h4>{option ? <button type="button" onClick={onCancel} className="text-xs text-muted">ยกเลิก</button> : null}</div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">ชื่อ<input value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-line bg-white px-2" /></label>
        <label className="grid gap-1 text-sm">ราคาเพิ่ม (บาท)<input inputMode="decimal" value={priceBaht} onChange={(event) => setPriceBaht(event.target.value)} className="rounded-lg border border-line bg-white px-2" /></label>
        <label className="grid gap-1 text-sm">ลำดับ<input type="number" min="0" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="rounded-lg border border-line bg-white px-2" /></label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} /> แสดง</label><label className="flex items-center gap-2"><input type="checkbox" checked={isAvailable} onChange={(event) => setIsAvailable(event.target.checked)} /> พร้อมขาย</label></div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button disabled={busy} className="rounded-lg border border-brand-action bg-white px-3 text-sm font-semibold text-brand-action disabled:opacity-50">บันทึกตัวเลือก</button>
    </form>
  )
}
