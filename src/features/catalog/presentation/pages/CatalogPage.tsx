import { useMemo, useState } from 'react'

import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useCatalogActions } from '../../application/use-catalog-actions'
import { useCatalog } from '../../application/use-catalog'
import type { Category, Product } from '../../domain/catalog'
import { AppShell } from '../../../../shared/presentation/AppShell'
import { CatalogList } from '../components/CatalogList'
import { CategoryForm } from '../components/CategoryForm'
import { ProductForm, type SaveProductFormInput } from '../components/ProductForm'
import { ProductOptionsEditor } from '../components/ProductOptionsEditor'

export function CatalogPage() {
  const { activeMembership: membership } = useActiveShop()
  const shopId = membership?.shop_id
  const isOwner = membership?.role === 'OWNER'
  const catalog = useCatalog(shopId)
  const actions = useCatalogActions(shopId ?? 'none')
  const [search, setSearch] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [optionsProductId, setOptionsProductId] = useState<string | null>(null)
  const categories = useMemo(() => catalog.data ?? [], [catalog.data])
  const optionsProduct = useMemo(
    () => categories.flatMap((category) => category.products).find((product) => product.id === optionsProductId) ?? null,
    [categories, optionsProductId],
  )
  const optionsCategoryProductCount = useMemo(
    () => categories.find((category) => category.id === optionsProduct?.categoryId)?.products.length ?? 0,
    [categories, optionsProduct?.categoryId],
  )
  const busy = Object.values(actions).some((action) => action.isPending)

  if (!shopId) return null

  async function deleteCategory(category: Category) {
    if (!window.confirm(`ลบหมวด “${category.name}”? หมวดที่ยังมีสินค้าจะลบไม่ได้`)) return
    await actions.deleteCategory.mutateAsync(category.id)
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`ลบสินค้า “${product.name}” และตัวเลือกทั้งหมด?`)) return
    await actions.deleteProduct.mutateAsync({ productId: product.id, imagePath: product.imagePath })
  }

  return (
    <AppShell>
      <main className="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-brand-action">Phase 2</p><h1 className="text-2xl font-bold">จัดการเมนูสินค้า</h1><p className="mt-1 text-sm text-muted">{membership?.shops?.name} · {isOwner ? 'Owner จัดการเมนูได้ทั้งหมด' : 'Staff เปลี่ยนสถานะพร้อมขายได้'}</p></div>
          <label className="grid gap-1 text-sm font-medium">ค้นหาเมนู<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ชื่อสินค้าหรือรายละเอียด" className="w-72 max-w-full rounded-lg border border-line px-3" /></label>
        </header>

        {isOwner ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <CategoryForm key={editingCategory?.id ?? 'new-category'} shopId={shopId} category={editingCategory} busy={actions.saveCategory.isPending} onCancel={() => setEditingCategory(null)} onSave={async (input) => { await actions.saveCategory.mutateAsync(input); setEditingCategory(null) }} />
            <ProductForm key={editingProduct?.id ?? 'new-product'} shopId={shopId} categories={categories} product={editingProduct} busy={actions.saveProduct.isPending} onCancel={() => setEditingProduct(null)} onSave={async (input: SaveProductFormInput) => { await actions.saveProduct.mutateAsync(input); setEditingProduct(null) }} />
          </section>
        ) : null}

        {optionsProduct && isOwner ? (
          <ProductOptionsEditor
            shopId={shopId}
            product={optionsProduct}
            categoryProductCount={optionsCategoryProductCount}
            busy={busy}
            onClose={() => setOptionsProductId(null)}
            onSaveGroup={(input) => actions.saveOptionGroup.mutateAsync(input).then(() => undefined)}
            onDeleteGroup={(id) => actions.deleteOptionGroup.mutateAsync(id)}
            onSaveOption={(input) => actions.saveProductOption.mutateAsync(input).then(() => undefined)}
            onDeleteOption={(id) => actions.deleteProductOption.mutateAsync(id)}
            onApplyGroup={(id) => actions.applyOptionGroupToCategory.mutateAsync(id)}
          />
        ) : null}

        {catalog.isLoading ? <p className="rounded-xl bg-brand-soft p-5">กำลังโหลดเมนู…</p> : null}
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
            onEditOptions={(product) => setOptionsProductId(product.id)}
            onToggleProduct={(product) => void actions.setProductAvailability.mutateAsync({ productId: product.id, available: !product.isAvailable })}
            onToggleOption={(option) => void actions.setProductOptionAvailability.mutateAsync({ optionId: option.id, available: !option.isAvailable })}
          />
        ) : null}
      </main>
    </AppShell>
  )
}
