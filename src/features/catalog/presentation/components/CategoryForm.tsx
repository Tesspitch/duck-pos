import { useState, type FormEvent } from 'react'

import { categoryFormSchema } from '../../application/catalog-form-schemas'
import type { Category, SaveCategoryInput } from '../../domain/catalog'

interface CategoryFormProps {
  shopId: string
  category: Category | null
  busy: boolean
  onCancel: () => void
  onSave: (input: SaveCategoryInput) => Promise<void>
}

export function CategoryForm({ shopId, category, busy, onCancel, onSave }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? '')
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0))
  const [isVisible, setIsVisible] = useState(category?.isVisible ?? true)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = categoryFormSchema.safeParse({ name, sortOrder, isVisible })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }

    setError(null)
    try {
      await onSave({ shopId, id: category?.id, ...parsed.data })
      if (!category) {
        setName('')
        setSortOrder('0')
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกหมวดหมู่ไม่สำเร็จ')
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-3 rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">{category ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</h2>
        {category ? <button type="button" onClick={onCancel} className="text-sm text-muted">ยกเลิก</button> : null}
      </div>
      <label className="grid gap-1 text-sm font-medium">
        ชื่อหมวดหมู่
        <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-line px-3" maxLength={80} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          ลำดับ
          <input type="number" min="0" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="rounded-lg border border-line px-3" />
        </label>
        <label className="flex min-h-11 items-center gap-2 pt-5 text-sm font-medium">
          <input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} />
          แสดงในเมนู
        </label>
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button disabled={busy} className="rounded-lg bg-brand-action px-4 font-semibold text-white disabled:opacity-50">
        {busy ? 'กำลังบันทึก…' : 'บันทึกหมวดหมู่'}
      </button>
    </form>
  )
}
