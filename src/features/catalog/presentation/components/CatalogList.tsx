import type { Category, Product, ProductOption } from '../../domain/catalog'
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
  onEditOptions: (product: Product) => void
  onToggleProduct: (product: Product) => void
  onToggleOption: (option: ProductOption) => void
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
  onEditOptions,
  onToggleProduct,
  onToggleOption,
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
        <section key={category.id} className="overflow-hidden rounded-2xl border border-line bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 bg-brand-soft px-4 py-3">
            <div>
              <h2 className="text-lg font-bold">{category.name}</h2>
              <p className="text-xs text-muted">ลำดับ {category.sortOrder} · {category.isVisible ? 'แสดงอยู่' : 'ซ่อนอยู่'}</p>
            </div>
            {isOwner ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => onEditCategory(category)} className="rounded-lg border border-line bg-white px-3 text-sm">แก้ไข</button>
                <button type="button" onClick={() => onDeleteCategory(category)} className="rounded-lg border border-red-200 bg-white px-3 text-sm text-red-700">ลบ</button>
              </div>
            ) : null}
          </header>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {category.products.length === 0 ? <p className="text-sm text-muted">ยังไม่มีสินค้าในหมวดนี้</p> : null}
            {category.products.map((product) => (
              <article key={product.id} className="grid gap-3 rounded-xl border border-line p-3">
                <div className="flex gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" loading="lazy" className="h-20 w-20 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-brand-soft text-2xl" aria-hidden="true">🌯</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold">{product.name}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {product.isAvailable ? 'พร้อมขาย' : 'หมด'}
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-brand-action">{formatThaiBaht(product.basePriceSatang)}</p>
                    {product.description ? <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p> : null}
                  </div>
                </div>
                <button type="button" disabled={busy} onClick={() => onToggleProduct(product)} className="rounded-lg border border-line px-3 text-sm font-semibold disabled:opacity-50">
                  {product.isAvailable ? 'ปิดขายชั่วคราว' : 'เปิดขาย'}
                </button>
                {product.optionGroups.map((group) => (
                  <div key={group.id} className="rounded-lg bg-neutral-50 p-3 text-sm">
                    <p className="font-semibold">{group.name} <span className="font-normal text-muted">เลือก {group.minSelect}–{group.maxSelect}</span></p>
                    <div className="mt-2 grid gap-2">
                      {group.options.map((option) => (
                        <div key={option.id} className="flex items-center justify-between gap-2">
                          <span className={!option.isAvailable ? 'text-muted line-through' : ''}>{option.name} {option.priceDeltaSatang > 0 ? `+${formatThaiBaht(option.priceDeltaSatang)}` : ''}</span>
                          <button type="button" disabled={busy} onClick={() => onToggleOption(option)} className="min-h-9 rounded-md border border-line bg-white px-2 text-xs disabled:opacity-50">
                            {option.isAvailable ? 'ปิดขาย' : 'เปิดขาย'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {isOwner ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onEditProduct(product)} className="rounded-lg border border-line px-3 text-sm">แก้ไขสินค้า</button>
                    <button type="button" onClick={() => onEditOptions(product)} className="rounded-lg border border-line px-3 text-sm">ตัวเลือก/ท็อปปิง</button>
                    <button type="button" onClick={() => onDeleteProduct(product)} className="rounded-lg border border-red-200 px-3 text-sm text-red-700">ลบ</button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
