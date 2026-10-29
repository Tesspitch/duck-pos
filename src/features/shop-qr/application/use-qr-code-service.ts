import { useContext } from 'react'

import { QrCodeServiceContext } from './qr-code-service-context'

export function useQrCodeService() {
  const service = useContext(QrCodeServiceContext)
  if (!service) throw new Error('QrCodeServiceProvider is missing.')
  return service
}
