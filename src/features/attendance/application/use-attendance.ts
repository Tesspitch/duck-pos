import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/application/auth-context'
import { useAttendanceLocation, useAttendanceRepository } from './attendance-context'
import type { HoursFilter } from '../domain/attendance'
export function useAttendanceClock() {
  const repository = useAttendanceRepository()
  const location = useAttendanceLocation()
  const { user } = useAuth()
  const client = useQueryClient()
  const state = useQuery({
    queryKey: ['attendance-state', user?.id], enabled: Boolean(user),
    queryFn: () => repository.getMine(), staleTime: 10_000,
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
      client.invalidateQueries({ queryKey: ['attendance-personal', user?.id] }),
    ]),
    onError: () => { void client.invalidateQueries({ queryKey: ['attendance-state', user?.id] }) },
  })
  return { state, action }
}

export function useAttendanceReport(shopId: string, filter: HoursFilter) {
  const repository = useAttendanceRepository()
  const { user } = useAuth()
  return useQuery({
    queryKey: ['attendance-report', user?.id, shopId, filter], enabled: Boolean(user && shopId),
    queryFn: () => repository.getReport(shopId, filter), staleTime: 15_000,
    refetchInterval: 60_000, refetchIntervalInBackground: false,
  })
}

export function usePersonalAttendance(shopId: string) {
  const repository = useAttendanceRepository()
  const { user } = useAuth()
  return useQuery({
    queryKey: ['attendance-personal', user?.id, shopId], enabled: Boolean(user && shopId),
    queryFn: () => repository.getPersonal(shopId, user!.id, new Date()),
    staleTime: 15_000, refetchInterval: 60_000, refetchIntervalInBackground: false,
  })
}
