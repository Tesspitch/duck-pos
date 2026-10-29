import { useState, type FormEvent } from 'react'

import { satangToBahtText } from '../../../catalog/domain/money'
import { toppingGroupFormSchema } from '../../application/topping-library-schemas'
import type { SaveToppingGroupInput, ToppingGroup, ToppingMenuCategory } from '../../domain/topping-library'

interface Props {
  shopId: string
  categories: ToppingMenuCategory[]
  group: ToppingGroup | null
  busy: boolean
  onCancel: () => void
  onSave: (input: SaveToppingGroupInput) => Promise<void>
}

export function ToppingGroupForm({ shopId, categories, group, busy, onCancel, onSave }: Props) {
  const [name, setName] = useState(group?.name ?? '')
  const [selectionMode, setSelectionMode] = useState(group?.selectionMode ?? 'SINGLE')
  const [isRequired, setIsRequired] = useState(group?.isRequired ?? false)
  const [pricingMode, setPricingMode] = useState(group?.pricingMode ?? 'PER_TOPPING')
  const [additionalPriceBaht, setAdditionalPriceBaht] = useState(
    satangToBahtText(group?.additionalSelectionPriceSatang ?? 0),
  )
  const [isVisible, setIsVisible] = useState(group?.isVisible ?? true)
  const [categoryIds, setCategoryIds] = useState(group?.categoryIds ?? [])
  const [error, setError] = useState<string | null>(null)

  function toggleCategory(categoryId: string) {
    setCategoryIds((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = toppingGroupFormSchema.safeParse({
      name,
      selectionMode,
      isRequired,
      pricingMode,
      additionalPriceBaht,
      isVisible,
      categoryIds,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }
    setError(null)
    try {
      await onSave({
        shopId,
        id: group?.id,
        name: parsed.data.name,
        selectionMode: parsed.data.selectionMode,
        isRequired: parsed.data.isRequired,
        pricingMode: parsed.data.pricingMode,
        additionalSelectionPriceSatang: parsed.data.additionalPriceBaht,
        isVisible: parsed.data.isVisible,
        categoryIds: parsed.data.categoryIds,
      })
      if (!group) {
        setName('')
        setCategoryIds([])
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกหมวดท็อปปิงไม่สำเร็จ')
    }
  }

  return <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-2xl border border-line p-4">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-sm font-semibold text-brand-action">หมวดท็อปปิง</p><h2 className="text-lg font-bold">{group ? 'แก้ไขหมวดท็อปปิง' : 'เพิ่มหมวดท็อปปิง'}</h2></div>
      {group ? <button type="button" onClick={onCancel} className="text-sm text-muted">ยกเลิก</button> : null}
    </div>
    <label className="grid gap-1 text-sm font-medium">ชื่อหมวดท็อปปิง<input value={name} onChange={(event) => setName(event.target.value)} placeholder="เช่น เพิ่มชีส หรือ เลือกซอส" maxLength={80} className="rounded-lg border border-line px-3" /></label>
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold">ลูกค้าเลือกได้แบบไหน</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${selectionMode === 'SINGLE' ? 'border-brand bg-brand-soft' : 'border-line'}`}>
          <input type="radio" name="selection-mode" checked={selectionMode === 'SINGLE'} onChange={() => { setSelectionMode('SINGLE'); setPricingMode('PER_TOPPING') }} />
          <span><strong className="block">เลือกได้อันเดียว</strong><span className="text-muted">เหมาะกับขนาดหรือชนิดที่ต้องเลือกหนึ่งอย่าง</span></span>
        </label>
        <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${selectionMode === 'MULTIPLE' ? 'border-brand bg-brand-soft' : 'border-line'}`}>
          <input type="radio" name="selection-mode" checked={selectionMode === 'MULTIPLE'} onChange={() => setSelectionMode('MULTIPLE')} />
          <span><strong className="block">เลือกได้หลายอัน</strong><span className="text-muted">เหมาะกับซอสหรือท็อปปิงที่เลือกผสมกันได้</span></span>
        </label>
      </div>
    </fieldset>
    <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} /> จำเป็นต้องเลือกอย่างน้อย 1 รายการ</label>
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold">วิธีคิดราคา</legend>
      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm"><input type="radio" name="pricing-mode" checked={pricingMode === 'PER_TOPPING'} onChange={() => setPricingMode('PER_TOPPING')} /> คิดราคาตามท็อปปิงแต่ละรายการ</label>
      <label className={`flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm ${selectionMode === 'SINGLE' ? 'cursor-not-allowed opacity-50' : ''}`}><input type="radio" name="pricing-mode" disabled={selectionMode === 'SINGLE'} checked={pricingMode === 'FIRST_FREE_THEN_FIXED'} onChange={() => setPricingMode('FIRST_FREE_THEN_FIXED')} /> รายการแรกฟรี รายการถัดไปราคาเท่ากัน</label>
      {pricingMode === 'FIRST_FREE_THEN_FIXED' ? <label className="grid gap-1 text-sm font-medium">ราคาต่อรายการตั้งแต่รายการที่ 2 (บาท)<input inputMode="decimal" value={additionalPriceBaht} onChange={(event) => setAdditionalPriceBaht(event.target.value)} className="rounded-lg border border-line px-3" /></label> : null}
    </fieldset>
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold">ใช้ได้กับหมวดหมู่เมนู</legend>
      {categories.length ? <div className="grid gap-2 sm:grid-cols-2">{categories.map((category) => <label key={category.id} className="flex min-h-11 items-center gap-2 rounded-lg bg-brand-soft px-3 text-sm"><input type="checkbox" checked={categoryIds.includes(category.id)} onChange={() => toggleCategory(category.id)} /> {category.name}</label>)}</div> : <p className="text-sm text-muted">กรุณาเพิ่มหมวดหมู่เมนูก่อน</p>}
    </fieldset>
    <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} /> แสดงหมวดท็อปปิงนี้</label>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <button disabled={busy || categories.length === 0} className="min-h-11 rounded-xl bg-brand-action px-4 font-bold text-white disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'บันทึกหมวดท็อปปิง'}</button>
  </form>
}
