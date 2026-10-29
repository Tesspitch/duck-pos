import { posCartLineTotal, posCartTotal } from '../../domain/pos-cart'
import { usePosCartStore } from '../../application/pos-cart-store'

const money = (satang: number) => `฿${(satang / 100).toFixed(2)}`

interface Props {
  disabled: boolean
  pending: boolean
  error: string | null
  onSubmit: () => void
}

export function PosCart({ disabled, pending, error, onSubmit }: Props) {
  const { lines, orderNote, changeQuantity, removeLine, setOrderNote } = usePosCartStore()
  const total = posCartTotal(lines)

  return (
    <aside className="rounded-2xl border border-line bg-white p-4 lg:sticky lg:top-4 lg:self-start">
      <h2 className="text-xl font-bold">🛒 ตะกร้า POS</h2>
      {lines.length === 0 ? <p className="mt-4 text-sm text-muted">เลือกสินค้าเพื่อเริ่มออเดอร์</p> : null}
      <ul className="mt-3 divide-y divide-line">
        {lines.map((line) => (
          <li key={line.key} className="py-3">
            <div className="flex justify-between gap-3"><p className="font-semibold">{line.productName}</p><p>{money(posCartLineTotal(line))}</p></div>
            {line.options.length ? <p className="text-xs text-muted">{line.options.map((option) => option.name).join(', ')}</p> : null}
            {line.note ? <p className="text-xs text-muted">หมายเหตุ: {line.note}</p> : null}
            <div className="mt-2 flex items-center gap-2">
              <button type="button" aria-label={`ลดจำนวน ${line.productName}`} onClick={() => changeQuantity(line.key, line.quantity - 1)} className="w-11 rounded-lg border border-line">−</button>
              <span className="min-w-8 text-center font-bold">{line.quantity}</span>
              <button type="button" aria-label={`เพิ่มจำนวน ${line.productName}`} onClick={() => changeQuantity(line.key, line.quantity + 1)} className="w-11 rounded-lg border border-line">+</button>
              <button type="button" onClick={() => removeLine(line.key)} className="ml-auto rounded-lg px-2 text-sm text-red-700">ลบ</button>
            </div>
          </li>
        ))}
      </ul>
      <label className="mt-3 grid gap-1 text-sm">หมายเหตุออเดอร์
        <textarea value={orderNote} maxLength={500} onChange={(event) => setOrderNote(event.target.value)}
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

