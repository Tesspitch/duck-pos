import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/application/auth-context'
import { useAttendanceLocation, useAttendanceRepository } from './attendance-context'
import type { HoursFilter } from '../domain/attendance'
export function useAttendance(shopId: string, filter: HoursFilter) {
  const repository = useAttendanceRepository()
  const location = useAttendanceLocation()
  const { user } = useAuth()
  const client = useQueryClient()
  const state = useQuery({
    queryKey: ['attendance-state', user?.id], enabled: Boolean(user),
    queryFn: () => repository.getMine(), staleTime: 10_000,
    refetchInterval: 60_000, refetchIntervalInBackground: false,
  })
  const report = useQuery({
    queryKey: ['attendance-report', user?.id, shopId, filter], enabled: Boolean(user && shopId),
    queryFn: () => repository.getReport(shopId, filter), staleTime: 15_000,
    refetchInterval: 60_000, refetchIntervalInBackground: false,
  })
  const action = useMutation({
    mutationFn: async (input: { type: 'IN'; shopId: string } | { type: 'OUT'; entryId: string }) => {
      if (input.type === 'OUT') return repository.clockOut(input.entryId)
      const position = await location.capture()
      return repository.clockIn(input.shopId, position)
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: ['attendance-state', user?.id] }),
      client.invalidateQueries({ queryKey: ['attendance-report', user?.id] }),
    ]),
    onError: () => { void client.invalidateQueries({ queryKey: ['attendance-state', user?.id] }) },
  })
  return { state, report, action }
}
