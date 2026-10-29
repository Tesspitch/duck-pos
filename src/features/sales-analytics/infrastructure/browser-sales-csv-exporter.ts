import type { SalesCsvExporter } from '../application/sales-csv-exporter'
import { salesHistoryCsv } from '../domain/sales-report'

export const browserSalesCsvExporter: SalesCsvExporter = {
  export(items, filename) {
    const blob = new Blob([`\uFEFF${salesHistoryCsv(items)}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  },
}
