import { useState, type FormEvent } from 'react'

import { toppingFormSchema } from '../../application/topping-library-schemas'
import { satangToBahtText } from '../../../catalog/domain/money'
import type { SaveToppingInput, Topping } from '../../domain/topping-library'
import type { OptionPricingMode } from '../../../../shared/domain/option-pricing'

interface Props {
  shopId: string
  groupId: string
  topping: Topping | null
  pricingMode: OptionPricingMode
  busy: boolean
  onCancel: () => void
  onSave: (input: SaveToppingInput) => Promise<void>
}

export function ToppingForm({ shopId, groupId, topping, pricingMode, busy, onCancel, onSave }: Props) {
  const [name, setName] = useState(topping?.name ?? '')
  const [priceBaht, setPriceBaht] = useState(topping ? satangToBahtText(topping.priceDeltaSatang) : '0.00')
  const [isVisible, setIsVisible] = useState(topping?.isVisible ?? true)
  const [isAvailable, setIsAvailable] = useState(topping?.isAvailable ?? true)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = toppingFormSchema.safeParse({ name, priceBaht, isVisible, isAvailable })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }
    setError(null)
    try {
      await onSave({
        shopId,
        groupId,
        id: topping?.id,
        name: parsed.data.name,
        priceDeltaSatang: pricingMode === 'FIRST_FREE_THEN_FIXED' ? 0 : parsed.data.priceBaht,
        isVisible: parsed.data.isVisible,
        isAvailable: parsed.data.isAvailable,
      })
      if (!topping) {
        setName('')
        setPriceBaht('0.00')
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกท็อปปิงไม่สำเร็จ')
    }
  }

  return <form onSubmit={(event) => void submit(event)} className="mt-3 grid gap-3 rounded-xl bg-neutral-50 p-3">
    <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">{topping ? 'แก้ไขท็อปปิง' : 'เพิ่มท็อปปิงในหมวดนี้'}</h4>{topping ? <button type="button" onClick={onCancel} className="text-xs text-muted">ยกเลิก</button> : null}</div>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">ชื่อท็อปปิง<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="rounded-lg border border-line bg-white px-3" /></label>
      {pricingMode === 'PER_TOPPING' ? <label className="grid gap-1 text-sm">ราคาเพิ่ม (บาท)<input inputMode="decimal" value={priceBaht} onChange={(event) => setPriceBaht(event.target.value)} className="rounded-lg border border-line bg-white px-3" /></label> : <p className="self-end rounded-lg bg-brand-soft px-3 py-2 text-sm text-muted">ราคากำหนดจากกฎของหมวด: รายการแรกฟรี</p>}
    </div>
    <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} /> แสดง</label><label className="flex items-center gap-2"><input type="checkbox" checked={isAvailable} onChange={(event) => setIsAvailable(event.target.checked)} /> พร้อมขาย</label></div>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <button disabled={busy} className="min-h-11 rounded-lg border border-brand-action bg-white px-3 text-sm font-semibold text-brand-action disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'บันทึกท็อปปิง'}</button>
  </form>
}
