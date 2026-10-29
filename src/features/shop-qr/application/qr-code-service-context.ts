import { createContext } from 'react'

import type { QrCodeService } from './qr-code-service'

export const QrCodeServiceContext = createContext<QrCodeService | null>(null)
