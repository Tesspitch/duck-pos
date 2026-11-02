import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ShopQrPage } from './ShopQrPage'

const qr = vi.hoisted(() => ({ createSvg: vi.fn().mockResolvedValue('<svg></svg>'), createPngDataUrl: vi.fn() }))
vi.mock('../../../../shared/presentation/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('../../../shop-context/application/active-shop-context', () => ({ useActiveShop: () => ({ activeMembership: { shop_id: 's', shops: { name: 'ร้านทดสอบ' } } }) }))
vi.mock('../../application/use-qr-code-service', () => ({ useQrCodeService: () => qr }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); qr.createPngDataUrl.mockReset() })

test('clipboard denial shows a recovery action', async () => {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
  render(<ShopQrPage />)
  fireEvent.click(screen.getByRole('button', { name: 'คัดลอกลิงก์' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('คัดลอกไม่สำเร็จ')
  expect(screen.getByRole('link', { name: 'เปิดหน้าลูกค้า' })).toHaveAttribute('href', expect.stringContaining('/order/s'))
  vi.unstubAllGlobals()
})

test('PNG creation failure is recoverable and restores the download control', async () => {
  qr.createPngDataUrl.mockRejectedValueOnce(new Error('canvas error'))
  render(<ShopQrPage />)
  fireEvent.click(screen.getByRole('button', { name: 'ดาวน์โหลด PNG' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('ดาวน์โหลดไม่สำเร็จ')
  expect(screen.getByRole('button', { name: 'ดาวน์โหลด PNG' })).toBeEnabled()
})

test('PNG download uses a named link attached to the document', async () => {
  qr.createPngDataUrl.mockResolvedValue('data:image/png;base64,test')
  const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.isConnected).toBe(true)
    expect(this.download).toMatch(/\.png$/)
    expect(this.href).toBe('data:image/png;base64,test')
  })
  render(<ShopQrPage />)
  fireEvent.click(screen.getByRole('button', { name: 'ดาวน์โหลด PNG' }))
  await screen.findByRole('button', { name: 'ดาวน์โหลด PNG' })
  expect(clicked).toHaveBeenCalledOnce()
})
