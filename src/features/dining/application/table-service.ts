import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export const serviceLabels = { STAFF: 'เรียกพนักงาน', BILL: 'เช็กบิล', CUTLERY: 'ขอช้อนส้อม', CONDIMENTS: 'ขอเครื่องปรุง' } as const
export type ServiceType = keyof typeof serviceLabels
export type ServiceRequest = { id: string; tableName: string; type: ServiceType; createdAt: string }

export async function requestService(tableQrToken: string, type: ServiceType) {
 const { error } = await supabase.rpc('request_table_service', { table_qr_token: tableQrToken, service_type: type })
 if (error) throw error
}
export function useServiceRequests(shopId: string) {
 return useQuery({ queryKey: ['table-service-requests', shopId], enabled: Boolean(shopId), queryFn: async () => {
  const { data, error } = await supabase.rpc('list_table_service_requests', { target_shop_id: shopId })
  if (error) throw error
  return data as ServiceRequest[]
 }, staleTime: 0, refetchInterval: 10000, refetchIntervalInBackground: false })
}
export function useAcknowledgeService(shopId: string) {
 const client = useQueryClient()
 return useMutation({ mutationFn: async (id: string) => {
  const { error } = await supabase.rpc('acknowledge_table_service_request', { request_id: id })
  if (error) throw error
 }, onSettled: () => client.invalidateQueries({ queryKey: ['table-service-requests', shopId] }) })
}
