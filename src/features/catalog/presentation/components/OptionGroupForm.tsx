import { useState, type FormEvent } from 'react'

import { optionGroupFormSchema } from '../../application/catalog-form-schemas'
import type { OptionGroup, SaveOptionGroupInput } from '../../domain/catalog'

interface OptionGroupFormProps {
  shopId: string
  productId: string
  group: OptionGroup | null
  busy: boolean
  onCancel: () => void
  onSave: (input: SaveOptionGroupInput) => Promise<void>
}

export function OptionGroupForm({ shopId, productId, group, busy, onCancel, onSave }: OptionGroupFormProps) {
  const [name, setName] = useState(group?.name ?? '')
  const [minSelect, setMinSelect] = useState(String(group?.minSelect ?? 0))
  const [maxSelect, setMaxSelect] = useState(String(group?.maxSelect ?? 1))
  const [sortOrder, setSortOrder] = useState(String(group?.sortOrder ?? 0))
  const [isVisible, setIsVisible] = useState(group?.isVisible ?? true)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = optionGroupFormSchema.safeParse({ name, minSelect, maxSelect, sortOrder, isVisible })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }
    try {
      setError(null)
      await onSave({ shopId, productId, id: group?.id, ...parsed.data })
      if (!group) setName('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกกลุ่มตัวเลือกไม่สำเร็จ')
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 rounded-xl border border-line p-3">
      <div className="flex items-center justify-between"><h3 className="font-semibold">{group ? 'แก้ไขกลุ่ม' : 'เพิ่มกลุ่มตัวเลือก'}</h3>{group ? <button type="button" onClick={onCancel} className="text-sm text-muted">ยกเลิก</button> : null}</div>
      <label className="grid gap-1 text-sm">ชื่อกลุ่ม<input value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-line px-3" /></label>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-1 text-sm">ขั้นต่ำ<input type="number" min="0" value={minSelect} onChange={(event) => setMinSelect(event.target.value)} className="rounded-lg border border-line px-2" /></label>
        <label className="grid gap-1 text-sm">สูงสุด<input type="number" min="1" value={maxSelect} onChange={(event) => setMaxSelect(event.target.value)} className="rounded-lg border border-line px-2" /></label>
        <label className="grid gap-1 text-sm">ลำดับ<input type="number" min="0" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="rounded-lg border border-line px-2" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} /> แสดงกลุ่มนี้</label>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button disabled={busy} className="rounded-lg bg-brand-action px-3 font-semibold text-white disabled:opacity-50">บันทึกกลุ่ม</button>
    </form>
  )
}
