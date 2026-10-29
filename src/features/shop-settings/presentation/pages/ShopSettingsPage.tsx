import { useState, type FormEvent } from 'react'

import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { shopBrandingSchema } from '../../application/shop-branding-schema'
import { useShopSettingsServices } from '../../application/shop-settings-context'
import { useShopSettings } from '../../application/use-shop-settings'
import { AppShell } from '../../../../shared/presentation/AppShell'

export function ShopSettingsPage() {
  const { activeMembership: membership } = useActiveShop()
  const { locationCaptureService } = useShopSettingsServices()
  const { settings, location, save, saveLocation } = useShopSettings(membership?.shop_id)
  const [name, setName] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [latitude, setLatitude] = useState<string | null>(null)
  const [longitude, setLongitude] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = shopBrandingSchema.safeParse({ name: name ?? settings.data?.name ?? '' })
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }
    try {
      const saved = await save.mutateAsync({ name: parsed.data.name, logoFile })
      setName(saved.name)
      setLogoFile(null)
      setMessage('บันทึกการตั้งค่าร้านแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function submitLocation(event: FormEvent) {
    event.preventDefault()
    const lat = Number(latitude ?? location.data?.latitude)
    const lng = Number(longitude ?? location.data?.longitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setLocationMessage('พิกัดร้านไม่ถูกต้อง')
      return
    }
    try {
      const saved = await saveLocation.mutateAsync({ latitude: lat, longitude: lng })
      setLatitude(String(saved.latitude))
      setLongitude(String(saved.longitude))
      setLocationMessage('บันทึกพิกัดร้านแล้ว')
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'บันทึกพิกัดไม่สำเร็จ')
    }
  }

  async function captureCurrentLocation() {
    setIsLocating(true)
    setLocationMessage(null)
    try {
      const current = await locationCaptureService.capture()
      setLatitude(current.latitude.toFixed(6))
      setLongitude(current.longitude.toFixed(6))
      setLocationMessage(`กรอกตำแหน่งปัจจุบันแล้ว ความแม่นยำประมาณ ${Math.round(current.accuracyM)} เมตร กรุณาตรวจสอบแล้วกดบันทึก`)
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'ไม่สามารถอ่านตำแหน่งปัจจุบันได้')
    } finally {
      setIsLocating(false)
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <section className="rounded-2xl border border-line bg-white p-6">
          <p className="text-sm font-semibold text-brand-action">Owner</p>
          <h1 className="mt-1 text-2xl font-bold">ตั้งค่าร้าน</h1>
          <p className="mt-1 text-sm text-muted">ข้อมูลพื้นฐานและโลโก้ร้านเท่านั้น การเปิด–ปิดร้านจะอยู่ใน Phase 5</p>

          {settings.isLoading ? <p className="mt-5">กำลังโหลด…</p> : null}
          {settings.isError ? (
            <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">โหลดการตั้งค่าร้านไม่สำเร็จ</p>
              <p className="mt-1">{settings.error.message}</p>
              <p className="mt-1">โปรดตรวจสอบว่าได้รัน migration 009 และ 010 แล้ว</p>
            </div>
          ) : null}
          {settings.data ? (
            <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-4">
              <div className="flex items-center gap-4">
                {settings.data.logoUrl ? <img src={settings.data.logoUrl} alt="โลโก้ร้าน" className="h-24 w-24 rounded-2xl border border-line object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-2xl bg-brand-soft text-4xl">🏪</div>}
                <div><p className="font-semibold">{settings.data.name}</p><p className="text-sm text-muted">{settings.data.timezone} · {settings.data.currencyCode}</p></div>
              </div>
              <label className="grid gap-1 text-sm font-medium">ชื่อร้าน<input value={name ?? settings.data.name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-line px-3" maxLength={120} /></label>
              <label className="grid gap-1 text-sm font-medium">โลโก้ร้าน<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} className="rounded-lg border border-line p-2" /><span className="text-xs font-normal text-muted">สูงสุด 2 MB ระบบปรับขนาดและแปลงเป็น WebP เป้าหมายประมาณ 100 KB</span></label>
              <button disabled={save.isPending} className="rounded-lg bg-brand-action px-4 font-semibold text-white disabled:opacity-50">{save.isPending ? 'กำลังปรับรูปและบันทึก…' : 'บันทึกการตั้งค่าร้าน'}</button>
              {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
            </form>
          ) : null}

          <form onSubmit={(event) => void submitLocation(event)} className="mt-8 grid gap-4 border-t border-line pt-6">
            <div><h2 className="text-lg font-bold">พิกัดสำหรับ QR Ordering</h2><p className="text-sm text-muted">ลูกค้าต้องอยู่ภายในรัศมี 100 เมตรจากพิกัดนี้</p></div>
            {location.isLoading ? <p>กำลังโหลดพิกัด…</p> : null}
            {location.isError ? <p role="alert" className="text-sm text-red-700">โหลดพิกัดไม่สำเร็จ: {location.error.message}</p> : null}
            <button type="button" disabled={isLocating} onClick={() => void captureCurrentLocation()} className="min-h-11 rounded-lg bg-brand-soft px-4 font-semibold text-brand-action disabled:opacity-50">{isLocating ? 'กำลังค้นหาตำแหน่ง…' : '📍 ใช้ตำแหน่งปัจจุบัน'}</button>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">Latitude<input type="number" step="0.000001" value={latitude ?? location.data?.latitude ?? ''} onChange={(event) => setLatitude(event.target.value)} className="rounded-lg border border-line px-3" /></label>
              <label className="grid gap-1 text-sm font-medium">Longitude<input type="number" step="0.000001" value={longitude ?? location.data?.longitude ?? ''} onChange={(event) => setLongitude(event.target.value)} className="rounded-lg border border-line px-3" /></label>
            </div>
            <button disabled={saveLocation.isPending} className="rounded-lg border border-brand-action px-4 font-semibold text-brand-action disabled:opacity-50">{saveLocation.isPending ? 'กำลังบันทึก…' : 'บันทึกพิกัดร้าน'}</button>
            {locationMessage ? <p role="status" className="text-sm text-muted">{locationMessage}</p> : null}
          </form>
        </section>
      </main>
    </AppShell>
  )
}
