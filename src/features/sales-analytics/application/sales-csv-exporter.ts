import type { SalesHistoryItem } from '../domain/sales-report'

export interface SalesCsvExporter {
  export(items: SalesHistoryItem[], filename: string): void
}
