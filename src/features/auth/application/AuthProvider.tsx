import type { Session } from '@supabase/supabase-js'
import { type PropsWithChildren, useEffect, useMemo, useState } from 'react'

import type { AuthGateway } from './auth-gateway'
import { AuthContext, type AuthContextValue } from './auth-context'

interface AuthProviderProps extends PropsWithChildren {
  gateway: AuthGateway
}

export function AuthProvider({ children, gateway }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    void gateway.getSession().then((currentSession) => {
      if (mounted) {
        setSession(currentSession)
        setLoading(false)
      }
    })

    const unsubscribe = gateway.onSessionChange((nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [gateway])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      signInWithGoogle: () =>
        gateway.signInWithGoogle(
          new URL('/auth/callback', window.location.origin).toString(),
        ),
      signOut: () => gateway.signOut(),
    }),
    [gateway, loading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

