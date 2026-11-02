import { useState } from 'react'
import logo from '../../../../../duckpos-logo.jpg'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../../application/auth-context'

export function LoginPage() {
  const { loading, user, signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  async function handleLogin() {
    setError(null)
    setSubmitting(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่')
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-6">
      <section className="w-full max-w-md rounded-3xl border border-line bg-white p-8 sm:p-12">
        <div className="mb-6 text-center">
          <img src={logo} alt="DuckPOS" width="160" height="160" className="mx-auto h-40 w-40 object-contain" />
          <p className="mt-4 text-xs font-semibold tracking-widest text-brand-action">พร้อมสำหรับวันขายที่ดี</p>
          <h1 className="mt-3 text-2xl font-bold">ยินดีต้อนรับกลับ</h1>
          <p className="mt-2 text-sm text-muted">สำหรับพนักงานและเจ้าของร้านที่ได้รับสิทธิ์</p>
        </div>
        <button
          type="button"
          disabled={submitting || loading}
          onClick={() => void handleLogin()}
          className="w-full rounded-xl bg-brand-action px-4 font-semibold text-white hover:bg-orange-800 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? 'กำลังไปยัง Google…' : 'เข้าสู่ระบบด้วย Google'}
        </button>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  )
}

