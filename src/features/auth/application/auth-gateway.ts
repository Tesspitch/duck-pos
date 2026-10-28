import type { Session } from '@supabase/supabase-js'

export interface AuthGateway {
  getSession: () => Promise<Session | null>
  onSessionChange: (listener: (session: Session | null) => void) => () => void
  signInWithGoogle: (redirectUrl: string) => Promise<void>
  signOut: () => Promise<void>
}

