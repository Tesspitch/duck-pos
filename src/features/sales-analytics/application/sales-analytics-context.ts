import { createContext, useContext } from 'react'

import type { SalesAnalyticsRepository } from './sales-analytics-repository'
import type { SalesCsvExporter } from './sales-csv-exporter'

interface SalesAnalyticsServices {
  repository: SalesAnalyticsRepository
  csvExporter: SalesCsvExporter
}

export const SalesAnalyticsContext = createContext<SalesAnalyticsServices | null>(null)

export function useSalesAnalyticsServices() {
  const services = useContext(SalesAnalyticsContext)
  if (!services) throw new Error('SalesAnalyticsProvider is missing.')
  return services
}
