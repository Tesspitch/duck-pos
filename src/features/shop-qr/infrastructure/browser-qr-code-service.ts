import type { QrCodeService } from '../application/qr-code-service'

const options = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  color: { dark: '#111827', light: '#FFFFFF' },
}

export const browserQrCodeService: QrCodeService = {
  async createSvg(value) {
    const { default: QRCode } = await import('qrcode')
    return QRCode.toString(value, { ...options, type: 'svg', width: 512 })
  },
  async createPngDataUrl(value, width = 1024) {
    const { default: QRCode } = await import('qrcode')
    return QRCode.toDataURL(value, { ...options, type: 'image/png', width })
  },
}
