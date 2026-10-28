import type { AuthGateway } from '../application/auth-gateway'
import { supabase } from '../../../lib/supabase'

export const supabaseAuthGateway: AuthGateway = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  onSessionChange(listener) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(session))
    return () => data.subscription.unsubscribe()
  },

  async signInWithGoogle(redirectUrl) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    })
    if (error) throw error
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}

