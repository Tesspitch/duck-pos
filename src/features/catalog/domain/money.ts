export function bahtTextToSatang(value: string): number {
  const normalized = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('กรุณากรอกราคาเป็นตัวเลขไม่เกิน 2 ตำแหน่ง')
  }

  const [baht, fraction = ''] = normalized.split('.')
  return Number(baht) * 100 + Number(fraction.padEnd(2, '0'))
}

export function satangToBahtText(value: number): string {
  return (value / 100).toFixed(2)
}

export function formatThaiBaht(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100)
}
