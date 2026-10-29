import type { PropsWithChildren } from 'react'

import type { QrCodeService } from './qr-code-service'
import { QrCodeServiceContext } from './qr-code-service-context'

export function QrCodeServiceProvider({ children, service }: PropsWithChildren<{ service: QrCodeService }>) {
  return <QrCodeServiceContext.Provider value={service}>{children}</QrCodeServiceContext.Provider>
}
