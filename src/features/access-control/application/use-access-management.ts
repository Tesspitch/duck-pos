import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ShopRole } from '../domain/membership'
import { useMembershipRepository } from './membership-repository-context'

export function useAccessManagement(shopId: string | undefined) {
  const repository = useMembershipRepository()
  const queryClient = useQueryClient()
  const shopMembersKey = ['shop-members', shopId] as const

  const members = useQuery({
    queryKey: shopMembersKey,
    enabled: Boolean(shopId),
    queryFn: () => repository.listForShop(shopId!),
  })

  const invalidateMemberships = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: shopMembersKey }),
      queryClient.invalidateQueries({ queryKey: ['memberships'] }),
    ])
  }

  const grantMember = useMutation({
    mutationFn: (input: { userId: string; role: ShopRole }) =>
      repository.grant({ shopId: shopId!, ...input }),
    onSuccess: invalidateMemberships,
  })

  const revokeMember = useMutation({
    mutationFn: (userId: string) => repository.revoke(shopId!, userId),
    onSuccess: invalidateMemberships,
  })

  return { members, grantMember, revokeMember }
}

