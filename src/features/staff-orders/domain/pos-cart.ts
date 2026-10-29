export interface PosCartOption {
  id: string
  name: string
  priceDeltaSatang: number
}

export interface PosCartLine {
  key: string
  productId: string
  productName: string
  basePriceSatang: number
  quantity: number
  note: string
  options: PosCartOption[]
}

export const posCartLineTotal = (line: PosCartLine) => (
  line.basePriceSatang + line.options.reduce((sum, option) => sum + option.priceDeltaSatang, 0)
) * line.quantity

export const posCartTotal = (lines: PosCartLine[]) =>
  lines.reduce((sum, line) => sum + posCartLineTotal(line), 0)

