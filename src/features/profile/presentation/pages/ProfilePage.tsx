import { useState, type FormEvent } from 'react'

import { useAuth } from '../../../auth/application/auth-context'
import { profileSchema } from '../../application/profile-schema'
import { useProfile } from '../../application/use-profile'
import { AppShell } from '../../../../shared/presentation/AppShell'

export function ProfilePage() {
  const { user } = useAuth()
  const { profile, update } = useProfile()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = profileSchema.safeParse({
      displayName: displayName ?? profile.data?.displayName ?? '',
    })
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
      return
    }
    try {
      await update.mutateAsync(parsed.data.displayName)
      setDisplayName(parsed.data.displayName)
      setMessage('บันทึกชื่อที่แสดงแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  const provider = user?.app_metadata.provider === 'google' ? 'Google' : (user?.app_metadata.provider ?? '-')

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <section className="rounded-2xl border border-line bg-white p-6">
          <p className="text-sm font-semibold text-brand-action">บัญชีที่กำลังใช้งาน</p>
          <div className="mt-4 flex items-center gap-4">
            {profile.data?.avatarUrl ? <img src={profile.data.avatarUrl} alt="รูปโปรไฟล์" className="h-20 w-20 rounded-full object-cover" referrerPolicy="no-referrer" /> : <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-3xl">👤</div>}
            <div className="min-w-0"><h1 className="truncate text-2xl font-bold">{profile.data?.displayName ?? 'ผู้ใช้ DuckPOS'}</h1><p className="truncate text-muted">{user?.email ?? profile.data?.email ?? '-'}</p><p className="text-sm text-muted">เข้าสู่ระบบผ่าน {provider}</p></div>
          </div>

          <dl className="mt-6 grid gap-3 rounded-xl bg-brand-soft p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">อีเมล</dt><dd className="break-all font-medium">{user?.email ?? '-'}</dd></div>
            <div><dt className="text-muted">Provider</dt><dd className="font-medium">{provider}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted">Supabase User ID</dt><dd className="break-all font-mono text-xs font-medium">{user?.id}</dd></div>
          </dl>

          <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-3">
            <label className="grid gap-1 text-sm font-medium">ชื่อที่แสดง<input value={displayName ?? profile.data?.displayName ?? ''} onChange={(event) => setDisplayName(event.target.value)} className="rounded-lg border border-line px-3" maxLength={100} /></label>
            <p className="text-xs text-muted">อีเมลและรูปบัญชีมาจาก Google หากต้องการเปลี่ยนให้แก้ที่บัญชี Google</p>
            <button disabled={update.isPending || profile.isLoading} className="rounded-lg bg-brand-action px-4 font-semibold text-white disabled:opacity-50">{update.isPending ? 'กำลังบันทึก…' : 'บันทึกโปรไฟล์'}</button>
            {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
          </form>
        </section>
      </main>
    </AppShell>
  )
}
