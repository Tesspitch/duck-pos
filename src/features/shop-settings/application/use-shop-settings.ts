import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { membershipQueryKey } from '../../access-control/application/use-memberships'
import { useAuth } from '../../auth/application/auth-context'
import { useShopSettingsServices } from './shop-settings-context'

export const shopSettingsQueryKey = (shopId: string) => ['shop-settings', shopId] as const

export function useShopSettings(shopId: string | undefined) {
  const { user } = useAuth()
  const { repository, logoService } = useShopSettingsServices()
  const queryClient = useQueryClient()
  const queryKey = shopSettingsQueryKey(shopId ?? 'none')

  const settings = useQuery({
    queryKey,
    enabled: Boolean(shopId),
    staleTime: 5 * 60_000,
    queryFn: () => repository.get(shopId!),
  })

  const save = useMutation({
    mutationFn: async ({ name, logoFile }: { name: string; logoFile: File | null }) => {
      if (!shopId) throw new Error('ไม่พบร้าน')
      const previousPath = settings.data?.logoPath ?? null
      let nextPath = previousPath
      if (logoFile) nextPath = await logoService.upload(shopId, logoFile)

      try {
        const saved = await repository.save({ shopId, name, logoPath: nextPath })
        if (logoFile && previousPath && previousPath !== nextPath) {
          await logoService.remove(previousPath).catch(() => undefined)
        }
        return saved
      } catch (error) {
        if (logoFile && nextPath && nextPath !== previousPath) {
          await logoService.remove(nextPath).catch(() => undefined)
        }
        throw error
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved)
      if (user) void queryClient.invalidateQueries({ queryKey: membershipQueryKey(user.id) })
    },
  })

  return { settings, save }
}
