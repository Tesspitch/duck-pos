import { useState } from 'react'
import logo from '../../../../assets/duckpos-logo-480.jpg'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../../application/auth-context'
import { Icon, type IconName } from '../../../../shared/presentation/Icon'
import { LoginStorefront } from '../components/LoginStorefront'

const features: {icon:IconName; label:string}[] = [
  {icon:'store',label:'จัดการร้าน'}, {icon:'queue',label:'รับและจัดคิว'}, {icon:'chart',label:'ดูยอดขาย'},
]

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
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-content">
          <img src={logo} alt="DuckPOS" width="216" height="216" className="login-logo" fetchPriority="high" />
          <p className="font-semibold text-brand-action">ระบบจัดการร้านอาหารแบบรับกลับ</p>
          <span className="login-divider" aria-hidden="true"/>
          <h1 id="login-title" className="text-2xl font-bold sm:text-3xl">เข้าสู่ระบบสำหรับพนักงาน</h1>
          <p className="mt-2 text-sm text-muted">ใช้บัญชี Google ที่ได้รับสิทธิ์จากเจ้าของร้าน</p>
        <button
          type="button"
          disabled={submitting || loading}
          onClick={() => void handleLogin()}
          className="login-google-button"
          aria-busy={submitting}
        >
          <span className="login-google-mark" aria-hidden="true"><svg viewBox="0 0 48 48" width="25" height="25"><path fill="#4285f4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"/><path fill="#34a853" d="M24 44c5.5 0 10.1-1.8 13.5-4.6l-6.6-5a12.2 12.2 0 0 1-18.2-6.4H5.9v5.2A20 20 0 0 0 24 44Z"/><path fill="#fbbc05" d="M12.7 28a12 12 0 0 1 0-8V14.8H5.9a20 20 0 0 0 0 18.4l6.8-5.2Z"/><path fill="#ea4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8A19.3 19.3 0 0 0 24 4 20 20 0 0 0 5.9 14.8l6.8 5.2c1.6-4.7 6-8.1 11.3-8.1Z"/></svg></span>
          {submitting ? 'กำลังไปยัง Google…' : 'เข้าสู่ระบบด้วย Google'}
        </button>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
          <ul className="login-features">{features.map(({icon,label})=><li key={icon}><span><Icon name={icon} size={25}/></span>{label}</li>)}</ul>
        </div>
        <LoginStorefront/>
        <footer className="login-help"><span>หากไม่สามารถเข้าสู่ระบบได้</span><a href="https://line.me/R/ti/p/%40597vzcpl" target="_blank" rel="noopener noreferrer">แจ้งปัญหา</a></footer>
      </section>
    </main>
  )
}

