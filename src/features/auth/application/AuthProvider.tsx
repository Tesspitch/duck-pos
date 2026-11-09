import type { Session } from '@supabase/supabase-js'
import { type PropsWithChildren, useEffect, useMemo, useState } from 'react'

import type { AuthGateway } from './auth-gateway'
import { AuthContext, type AuthContextValue } from './auth-context'

interface AuthProviderProps extends PropsWithChildren {
  gateway: AuthGateway
  onAccountChange?: () => void
}

export function AuthProvider({ children, gateway, onAccountChange }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let receivedAuthEvent = false
    let currentUserId: string | null | undefined

    function applySession(nextSession: Session | null) {
      const nextUserId = nextSession?.user.id ?? null
      if (currentUserId !== undefined && currentUserId !== nextUserId) onAccountChange?.()
      currentUserId = nextUserId
      setSession(nextSession)
      setLoading(false)
    }


    void gateway.getSession().then((currentSession) => {
      if (mounted && !receivedAuthEvent) applySession(currentSession)
    }).catch(() => {
      if (mounted && !receivedAuthEvent) applySession(null)
    })

    const unsubscribe = gateway.onSessionChange((nextSession) => {
      if (!mounted) return
      receivedAuthEvent = true
      applySession(nextSession)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [gateway, onAccountChange])

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

