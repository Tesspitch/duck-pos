import { useState, type FormEvent } from 'react'

import { useActiveShop } from '../../../shop-context/application/active-shop-context'
import { shopBrandingSchema } from '../../application/shop-branding-schema'
import { useShopSettings } from '../../application/use-shop-settings'
import { AppShell } from '../../../../shared/presentation/AppShell'

export function ShopSettingsPage() {
  const { activeMembership: membership } = useActiveShop()
  const { settings, save } = useShopSettings(membership?.shop_id)
  const [name, setName] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)

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
        </section>
      </main>
    </AppShell>
  )
}
