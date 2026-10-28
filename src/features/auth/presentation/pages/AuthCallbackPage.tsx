import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../application/auth-context'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { loading, user } = useAuth()

  useEffect(() => {
    if (!loading) navigate(user ? '/' : '/login', { replace: true })
  }, [loading, navigate, user])

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <p className="text-lg font-semibold">กำลังยืนยันการเข้าสู่ระบบ…</p>
    </main>
  )
}

