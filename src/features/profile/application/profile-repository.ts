import type { Profile } from '../domain/profile'

export interface ProfileRepository {
  get(userId: string): Promise<Profile>
  updateDisplayName(displayName: string): Promise<Profile>
}
