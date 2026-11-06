import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDiningRepository } from './dining-context'
import type { DiningRepository } from './dining-context'
export function useDiningTables(shopId: string) {
 const repository = useDiningRepository()
 return useQuery({ queryKey: ['dining-tables',shopId], enabled: Boolean(shopId), queryFn: () => repository.list(shopId), staleTime: 5_000, refetchInterval: 30_000, refetchIntervalInBackground: false })
}
export function useDiningBill(id: string | undefined) {
 const repository = useDiningRepository()
 return useQuery({ queryKey: ['dining-bill',id], enabled: Boolean(id), queryFn: () => repository.bill(id!), staleTime: 0, refetchInterval: 15_000, refetchIntervalInBackground: false })
}
export function useDiningAction(shopId: string) {
 const repository = useDiningRepository()
 const client = useQueryClient()
 return useMutation({
  mutationFn: (command: (repository: DiningRepository) => Promise<unknown>) => command(repository),
  onSuccess: () => Promise.all(['dining-tables','dining-bill','dining-round','dining-context','staff-orders','store-management','sales-dashboard','sales-history'].map(key => client.invalidateQueries({ queryKey: ['dining-bill','dining-round','dining-context'].includes(key) ? [key] : [key,shopId] }))),
  onError: () => { void client.invalidateQueries({ queryKey: ['dining-bill'] }); void client.invalidateQueries({ queryKey: ['dining-tables',shopId] }) },
 })
}
export function useDiningContext(token: string | undefined) {
 const repository = useDiningRepository()
 return useQuery({ queryKey: ['dining-context',token], enabled: Boolean(token), queryFn: () => repository.context(token!), staleTime: 0, refetchInterval: 15_000, refetchIntervalInBackground: false })
}
export function useDiningRound(token: string | undefined) {
 const repository = useDiningRepository()
 return useQuery({ queryKey: ['dining-round',token], enabled: Boolean(token), queryFn: () => repository.track(token!), staleTime: 0, refetchOnWindowFocus: true,
  refetchInterval: query => document.visibilityState === 'hidden' || query.state.data?.closed ? false : query.state.data?.status === 'PAID' ? 15_000 : 7_000,
 })
}
