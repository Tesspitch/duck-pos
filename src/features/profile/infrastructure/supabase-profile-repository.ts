import { supabase } from '../../../lib/supabase'
import type { ProfileRepository } from '../application/profile-repository'
import type { Profile } from '../domain/profile'

interface ProfileRow {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  }
}

export const supabaseProfileRepository: ProfileRepository = {
  async get(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, avatar_url')
      .eq('id', userId)
      .single()
    if (error) throw error
    return mapProfile(data as ProfileRow)
  },

  async updateDisplayName(displayName) {
    const { data, error } = await supabase.rpc('update_my_profile', {
      profile_display_name: displayName,
    })
    if (error) throw error
    return mapProfile(data as ProfileRow)
  },
}
