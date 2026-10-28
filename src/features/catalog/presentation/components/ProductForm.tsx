import { useState, type FormEvent } from 'react'

import { productFormSchema } from '../../application/catalog-form-schemas'
import type { Category, Product, SaveProductInput } from '../../domain/catalog'
import { satangToBahtText } from '../../domain/money'

export interface SaveProductFormInput extends SaveProductInput {
  imageFile?: File | null
}

interface ProductFormProps {
  shopId: string
  categories: Category[]
  product: Product | null
  initialCategoryId?: string
  busy: boolean
  onCancel: () => void
  onSave: (input: SaveProductFormInput) => Promise<void>
}

export function ProductForm({
  shopId,
  categories,
  product,
  initialCategoryId,
  busy,
  onCancel,
  onSave,
}: ProductFormProps) {
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? initialCategoryId ?? categories[0]?.id ?? '')
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [priceBaht, setPriceBaht] = useState(product ? satangToBahtText(product.basePriceSatang) : '0.00')
  const [sortOrder, setSortOrder] = useState(String(product?.sortOrder ?? 0))
  const [isVisible, setIsVisible] = useState(product?.isVisible ?? true)
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedCategoryId = categoryId || categories[0]?.id || ''

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = productFormSchema.safeParse({
      categoryId: selectedCategoryId,
      name,
      description,
      priceBaht,
      sortOrder,
      isVisible,
      isAvailable,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }

    setError(null)
    try {
      await onSave({
        shopId,
        id: product?.id,
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description,
        basePriceSatang: parsed.data.priceBaht,
        imagePath: product?.imagePath ?? null,
        sortOrder: parsed.data.sortOrder,
        isVisible: parsed.data.isVisible,
        isAvailable: parsed.data.isAvailable,
        imageFile,
      })
      if (!product) {
        setName('')
        setDescription('')
        setPriceBaht('0.00')
        setImageFile(null)
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกสินค้าไม่สำเร็จ')
    }
  }

  if (categories.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">เพิ่มหมวดหมู่ก่อนเพิ่มสินค้า</p>
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-3 rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">{product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</h2>
        {product ? <button type="button" onClick={onCancel} className="text-sm text-muted">ยกเลิก</button> : null}
      </div>
      <label className="grid gap-1 text-sm font-medium">
        หมวดหมู่
        <select value={selectedCategoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-lg border border-line px-3">
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        ชื่อสินค้า
        <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-line px-3" maxLength={120} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        รายละเอียด
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 rounded-lg border border-line p-3" maxLength={1000} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          ราคาพื้นฐาน (บาท)
          <input inputMode="decimal" value={priceBaht} onChange={(event) => setPriceBaht(event.target.value)} className="rounded-lg border border-line px-3" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          ลำดับ
          <input type="number" min="0" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="rounded-lg border border-line px-3" />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        รูปสินค้า (สูงสุด 5 MB ระบบจะแปลงเป็น WebP)
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="rounded-lg border border-line p-2" />
      </label>
      <div className="flex flex-wrap gap-5 text-sm font-medium">
        <label className="flex items-center gap-2"><input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} /> แสดงในเมนู</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={isAvailable} onChange={(event) => setIsAvailable(event.target.checked)} /> พร้อมขาย</label>
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button disabled={busy} className="rounded-lg bg-brand-action px-4 font-semibold text-white disabled:opacity-50">
        {busy ? 'กำลังบันทึกและปรับรูป…' : 'บันทึกสินค้า'}
      </button>
    </form>
  )
}
