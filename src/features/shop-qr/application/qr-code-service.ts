export interface QrCodeService {
  createSvg(value: string): Promise<string>
  createPngDataUrl(value: string, width?: number): Promise<string>
}
