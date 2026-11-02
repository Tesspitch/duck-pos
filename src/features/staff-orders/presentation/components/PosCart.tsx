import { posCartLineTotal, posCartTotal } from '../../domain/pos-cart'
import { usePosCartStore } from '../../application/pos-cart-store'
import { Icon } from '../../../../shared/presentation/Icon'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

interface Props {
  disabled: boolean
  pending: boolean
  error: string | null
  onSubmit: () => void
  onEmpty?: () => void
  productImages?: Record<string, string | null>
}

export function PosCart({ disabled, pending, error, onSubmit, onEmpty, productImages = {} }: Props) {
  const { lines, orderNote, changeQuantity, removeLine, setOrderNote } = usePosCartStore()
  const total = posCartTotal(lines)

  return (
    <aside id="pos-cart" className="scroll-mt-40 rounded-2xl border border-line bg-white p-4 lg:sticky lg:top-4 lg:self-start">
      <h2 className="text-xl font-bold">ออเดอร์นี้</h2>
      {lines.length === 0 ? <p className="mt-4 text-sm text-muted">เลือกสินค้าเพื่อเริ่มออเดอร์</p> : null}
      <ul className="mt-3 divide-y divide-line">
        {lines.map((line) => (
          <li key={line.key} className="py-3">
            <div className="flex items-start gap-3">{productImages[line.productId] ? <img src={productImages[line.productId]!} alt={line.productName} width="64" height="64" className="cart-product-image" loading="lazy" /> : <span className="cart-product-placeholder" aria-hidden="true"><Icon name="menu" /></span>}<div className="min-w-0 flex-1"><p className="font-semibold">{line.productName}</p></div><p className="shrink-0 font-semibold">{money(posCartLineTotal(line))}</p></div>
            {line.options.length ? <p className="text-xs text-muted">{line.options.map((option) => option.name).join(', ')}</p> : null}
            {line.note ? <p className="text-xs text-muted">หมายเหตุ: {line.note}</p> : null}
            <div className="mt-2 flex items-center gap-2">
              <button type="button" disabled={pending || line.quantity <= 1} aria-label={`ลดจำนวน ${line.productName}`} onClick={() => changeQuantity(line.key, line.quantity - 1)} className="w-11 rounded-lg border border-line">−</button>
              <span className="min-w-8 text-center font-bold">{line.quantity}</span>
              <button type="button" disabled={pending || line.quantity >= 20} aria-label={`เพิ่มจำนวน ${line.productName}`} onClick={() => changeQuantity(line.key, line.quantity + 1)} className="w-11 rounded-lg border border-line">+</button>
              <button type="button" disabled={pending} aria-label={`ลบ ${line.productName}`} onClick={() => { if (lines.length === 1) onEmpty?.(); removeLine(line.key) }} className="ml-auto rounded-lg px-2 text-sm text-red-700">ลบ</button>
            </div>
          </li>
        ))}
      </ul>
      <label className="mt-3 grid gap-1 text-sm">หมายเหตุออเดอร์
        <textarea disabled={pending} value={orderNote} maxLength={500} onChange={(event) => setOrderNote(event.target.value)}
          className="min-h-20 rounded-lg border border-line p-3" />
      </label>
      <div className="mt-4 flex justify-between text-xl font-bold"><span>รวม</span><span>{money(total)}</span></div>
      {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <button type="button" disabled={disabled || pending || lines.length === 0} onClick={onSubmit}
        className="mt-4 w-full rounded-xl bg-brand-action px-4 font-bold text-white disabled:opacity-50">
        {pending ? 'กำลังสร้างออเดอร์…' : 'สร้างออเดอร์และรับเลขคิว'}
      </button>
    </aside>
  )
}

