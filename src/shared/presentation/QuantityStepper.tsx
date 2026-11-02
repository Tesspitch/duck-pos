interface Props {
  value: number
  onChange: (value: number) => void
  label?: string
  disabled?: boolean
  showLabel?: boolean
}

export function QuantityStepper({ value, onChange, label = 'จำนวน', disabled = false, showLabel = true }: Props) {
  const change = (next: number) => onChange(Math.max(1, Math.min(20, Math.trunc(next) || 1)))
  return <div className="quantity-stepper">
    {showLabel && <span className="quantity-stepper-label">จำนวน</span>}
    <div className="quantity-stepper-controls" role="group" aria-label={`เลือก${label}`}>
      <button type="button" disabled={disabled || value <= 1} aria-label={`ลด${label}`} onClick={() => change(value - 1)}>−</button>
      <input type="number" inputMode="numeric" min={1} max={20} step={1} aria-label={label} disabled={disabled} value={value} onChange={(event) => change(Number(event.target.value))} />
      <button type="button" disabled={disabled || value >= 20} aria-label={`เพิ่ม${label}`} onClick={() => change(value + 1)}>+</button>
    </div>
  </div>
}
