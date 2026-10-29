import type { PropsWithChildren } from 'react'

import { SalesAnalyticsContext } from './sales-analytics-context'
import type { SalesAnalyticsRepository } from './sales-analytics-repository'
import type { SalesCsvExporter } from './sales-csv-exporter'

interface Props extends PropsWithChildren {
  repository: SalesAnalyticsRepository
  csvExporter: SalesCsvExporter
}

export function SalesAnalyticsProvider({ children, repository, csvExporter }: Props) {
  return <SalesAnalyticsContext.Provider value={{ repository, csvExporter }}>{children}</SalesAnalyticsContext.Provider>
}
