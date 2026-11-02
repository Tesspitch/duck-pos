import { Icon } from '../../../../shared/presentation/Icon'
import { useMemo, useState } from 'react'
import { LoadingState } from '../../../../shared/presentation/LoadingState'
import { FormWorkspace } from '../../../../shared/presentation/FormWorkspace'

import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useCatalogActions } from '../../application/use-catalog-actions'
import { useCatalog } from '../../application/use-catalog'
import type { Category, Product } from '../../domain/catalog'
import { nextSortOrder } from '../../../../shared/domain/sort-order'
import { AppShell } from '../../../../shared/presentation/AppShell'
import { CatalogList } from '../components/CatalogList'
import { CategoryForm } from '../components/CategoryForm'
import { ProductForm, type SaveProductFormInput } from '../components/ProductForm'

export function CatalogPage() {
  const { activeMembership: membership } = useActiveShop()
  const shopId = membership?.shop_id
  const isOwner = membership?.role === 'OWNER'
  const catalog = useCatalog(shopId)
  const actions = useCatalogActions(shopId ?? 'none')
  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState<'product' | 'category' | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const categories = useMemo(() => catalog.data ?? [], [catalog.data])
  const busy = Object.values(actions).some((action) => action.isPending)

  if (!shopId) return null

  async function deleteCategory(category: Category) {
    if (!window.confirm(`ลบหมวด “${category.name}”? หมวดที่ยังมีสินค้าจะลบไม่ได้`)) return
    actions.deleteCategory.mutate(category.id)
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`ลบสินค้า “${product.name}” และตัวเลือกทั้งหมด?`)) return
    actions.deleteProduct.mutate({ productId: product.id, imagePath: product.imagePath })
  }

  return (
    <AppShell>
      <main className="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-brand-action">เมนูและสถานะสินค้า</p><h1 className="text-2xl font-bold"><Icon name="menu" /> เมนูสินค้า</h1><p className="mt-1 text-sm text-muted">{membership?.shops?.name} · {isOwner ? 'เจ้าของร้าน' : 'พนักงาน'}</p></div>
          <label className="grid gap-1 text-sm font-medium">ค้นหาเมนู<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ชื่อสินค้าหรือรายละเอียด" className="w-72 max-w-full rounded-lg border border-line px-3" /></label>
        </header>

        {isOwner && <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setEditingProduct(null); setEditor(editor === 'product' ? null : 'product') }} className="rounded-xl bg-brand px-5 font-bold text-ink">＋ เพิ่มเมนู</button><button type="button" onClick={() => { setEditingCategory(null); setEditor(editor === 'category' ? null : 'category') }} className="rounded-xl border border-line bg-white px-5 font-semibold">＋ เพิ่มหมวดหมู่</button></div>}
        {isOwner && (editor || editingCategory || editingProduct) ? (
          <FormWorkspace title={editingCategory || editor === 'category' ? ' หมวดหมู่เมนู' : ' เมนูสินค้า'} busy={busy} onBack={() => { setEditingCategory(null); setEditingProduct(null); setEditor(null) }}>
            <div hidden={editor !== 'category' && !editingCategory}>
            <CategoryForm key={editingCategory?.id ?? 'new-category'} shopId={shopId} category={editingCategory} nextSortOrder={nextSortOrder(categories)} busy={actions.saveCategory.isPending} onCancel={() => { setEditingCategory(null); setEditor(null) }} onSave={async (input) => { await actions.saveCategory.mutateAsync(input); setEditingCategory(null); setEditor(null) }} />
            </div><div hidden={editor !== 'product' && !editingProduct}>
            <ProductForm key={editingProduct?.id ?? 'new-product'} shopId={shopId} categories={categories} product={editingProduct} busy={actions.saveProduct.isPending} onCancel={() => { setEditingProduct(null); setEditor(null) }} onSave={async (input: SaveProductFormInput) => { await actions.saveProduct.mutateAsync(input); setEditingProduct(null); setEditor(null) }} />
            </div>
          </FormWorkspace>
        ) : null}

        {catalog.isLoading ? <LoadingState label="กำลังโหลดเมนู…" /> : null}
        {catalog.isError ? <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">โหลดเมนูไม่สำเร็จ กรุณาลองใหม่</p> : null}
        {catalog.isSuccess ? (
          <CatalogList
            categories={categories}
            isOwner={isOwner}
            search={search}
            busy={busy}
            onEditCategory={setEditingCategory}
            onDeleteCategory={(category) => void deleteCategory(category)}
            onEditProduct={setEditingProduct}
            onDeleteProduct={(product) => void deleteProduct(product)}
            onToggleProduct={(product) => actions.setProductAvailability.mutate({ productId: product.id, available: !product.isAvailable })}
          />
        ) : null}
      </main>
    </AppShell>
  )
}
