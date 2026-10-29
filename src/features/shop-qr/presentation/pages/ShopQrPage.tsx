import { useEffect, useMemo, useState } from 'react'

import { AppShell } from '../../../../shared/presentation/AppShell'
import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { useQrCodeService } from '../../application/use-qr-code-service'
import { buildShopMenuUrl, qrDownloadName } from '../../domain/shop-menu-link'

export function ShopQrPage() {
  const { activeMembership } = useActiveShop()
  const qrCodeService = useQrCodeService()
  const shopId = activeMembership?.shop_id ?? ''
  const shopName = activeMembership?.shops?.name ?? 'ร้าน DuckPOS'
  const menuUrl = useMemo(() => buildShopMenuUrl(window.location.origin, shopId), [shopId])
  const [svg, setSvg] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void qrCodeService.createSvg(menuUrl)
      .then((value) => { if (active) { setSvg(value); setError(null) } })
      .catch(() => { if (active) setError('สร้าง QR Code ไม่สำเร็จ กรุณาลองใหม่') })
    return () => { active = false }
  }, [menuUrl, qrCodeService])

  const svgDataUrl = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''

  async function copyLink() {
    await navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function download(url: string, extension: 'png' | 'svg') {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = qrDownloadName(shopName, extension)
    anchor.click()
  }

  async function downloadPng() {
    download(await qrCodeService.createPngDataUrl(menuUrl), 'png')
  }

  return <AppShell><main className="mx-auto max-w-4xl p-4 sm:p-6">
    <div className="qr-hide-on-print"><p className="text-sm font-semibold text-brand-action">Phase 3 · Owner</p><h1 className="text-2xl font-bold">QR สั่งอาหาร</h1><p className="mt-1 text-sm text-muted">สร้างจากลิงก์เมนูของร้านโดยตรง ไม่เก็บรูปไว้บนเซิร์ฟเวอร์</p></div>
    <section className="qr-print-card mt-5 grid gap-6 rounded-2xl border border-line bg-white p-5 sm:grid-cols-[minmax(260px,360px)_1fr] sm:p-7">
      <div className="grid place-items-center rounded-2xl bg-white p-3">
        {svgDataUrl ? <img src={svgDataUrl} alt={`QR Code เมนูร้าน ${shopName}`} className="aspect-square w-full max-w-80" /> : <div className="aspect-square w-full max-w-80 animate-pulse rounded-xl bg-brand-soft" />}
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-sm font-semibold text-brand-action">สแกนเพื่อสั่งอาหาร</p>
        <h2 className="mt-1 text-3xl font-bold">{shopName}</h2>
        <p className="mt-3 break-all rounded-xl bg-brand-soft p-3 text-sm">{menuUrl}</p>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="qr-hide-on-print mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => void copyLink()} className="min-h-11 rounded-xl border border-line font-semibold">{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</button>
          <a href={menuUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line font-semibold">เปิดหน้าลูกค้า</a>
          <button type="button" disabled={!svgDataUrl} onClick={() => download(svgDataUrl, 'svg')} className="min-h-11 rounded-xl bg-brand-action font-semibold text-white disabled:opacity-50">ดาวน์โหลด SVG</button>
          <button type="button" onClick={() => void downloadPng()} className="min-h-11 rounded-xl bg-brand-action font-semibold text-white">ดาวน์โหลด PNG</button>
          <button type="button" onClick={() => window.print()} className="min-h-11 rounded-xl border border-line font-semibold sm:col-span-2">พิมพ์ป้าย QR</button>
        </div>
      </div>
    </section>
    <p className="qr-hide-on-print mt-4 text-sm text-muted">QR จะเปลี่ยนตามร้านที่เลือกจากเมนูด้านบน กรุณาทดสอบสแกนก่อนนำไปติดหน้าร้าน</p>
  </main></AppShell>
}
