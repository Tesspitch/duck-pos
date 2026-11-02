import { Icon } from '../../../../shared/presentation/Icon'
import { ItemActions } from '../../../../shared/presentation/ItemActions'
import type { Category, Product } from '../../domain/catalog'
import { formatThaiBaht } from '../../domain/money'

interface CatalogListProps {
  categories: Category[]
  isOwner: boolean
  search: string
  busy: boolean
  onEditCategory: (category: Category) => void
  onDeleteCategory: (category: Category) => void
  onEditProduct: (product: Product) => void
  onDeleteProduct: (product: Product) => void
  onToggleProduct: (product: Product) => void
}

export function CatalogList({
  categories,
  isOwner,
  search,
  busy,
  onEditCategory,
  onDeleteCategory,
  onEditProduct,
  onDeleteProduct,
  onToggleProduct,
}: CatalogListProps) {
  const query = search.trim().toLocaleLowerCase('th')
  const visibleCategories = categories
    .map((category) => ({
      ...category,
      products: category.products.filter((product) =>
        !query || `${product.name} ${product.description}`.toLocaleLowerCase('th').includes(query)),
    }))
    .filter((category) => !query || category.products.length > 0 || category.name.toLocaleLowerCase('th').includes(query))

  if (categories.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">ยังไม่มีหมวดหมู่ เริ่มจากเพิ่มหมวดหมู่ด้านบน</p>
  }
  if (visibleCategories.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">ไม่พบสินค้าที่ค้นหา</p>
  }

  return (
    <div className="grid gap-5">
      {visibleCategories.map((category) => (
        <section key={category.id} className="rounded-2xl border border-line bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 bg-brand-soft px-4 py-3">
            <div>
              <h2 className="text-lg font-bold">{category.name}</h2>
              <p className="text-xs text-muted">{category.isVisible ? 'แสดงอยู่' : 'ซ่อนอยู่'}</p>
            </div>
            {isOwner ? (
              <ItemActions name={`หมวด ${category.name}`} disabled={busy} onEdit={() => onEditCategory(category)} onDelete={() => onDeleteCategory(category)} />
            ) : null}
          </header>
          <div className="catalog-compact-grid">
            {category.products.length === 0 ? <p className="text-sm text-muted">ยังไม่มีสินค้าในหมวดนี้</p> : null}
            {category.products.map((product) => (
              <article key={product.id} className="catalog-compact-card rounded border border-line">
                <div className="flex gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded bg-brand-soft text-2xl" aria-hidden="true"><Icon name="menu" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold">{product.name}</h3>
                      {isOwner && <ItemActions name={`สินค้า ${product.name}`} disabled={busy} onEdit={() => onEditProduct(product)} onDelete={() => onDeleteProduct(product)} />}
                    </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {product.isAvailable ? '● พร้อมขาย' : '● ปิดขายอยู่'}
                      </span>
                    <p className="mt-1 font-semibold text-brand-action">{formatThaiBaht(product.basePriceSatang)}</p>
                    {product.description ? <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p> : null}
                  </div>
                </div>
                <div className="catalog-compact-actions">
                <button type="button" title={product.isAvailable ? 'หยุดรับออเดอร์สินค้านี้ทั้ง POS และ QR' : 'กลับมาเปิดรับออเดอร์สินค้านี้'} disabled={busy} aria-label={`${product.isAvailable ? 'ปิดขาย' : 'เปิดขาย'}สินค้า ${product.name}`} onClick={() => onToggleProduct(product)} className={`availability-action rounded ${product.isAvailable ? 'pause-sale' : 'resume-sale'}`}>
                  <span aria-hidden="true">{product.isAvailable ? 'Ⅱ' : ''}</span>
                  {product.isAvailable ? 'ปิดขายสินค้านี้' : 'เปิดขายสินค้านี้'}
                </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
