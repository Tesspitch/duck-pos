import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { RealtimeConnectionState } from './staff-orders-realtime'
import { useStaffOrdersServices } from './staff-orders-context'
import { staffOrdersQueryKey } from './use-staff-orders'

export function useStaffOrdersRealtime(shopId: string | undefined) {
  const { realtime } = useStaffOrdersServices()
  const queryClient = useQueryClient()
  const [state, setState] = useState<RealtimeConnectionState>('CONNECTING')

  useEffect(() => {
    if (!shopId) return
    const refresh = () => void queryClient.invalidateQueries({ queryKey: staffOrdersQueryKey(shopId) })
    const unsubscribe = realtime.subscribe(shopId, refresh, setState)
    const handleOnline = () => {
      setState('RECONNECTING')
      refresh()
    }
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
      unsubscribe()
    }
  }, [queryClient, realtime, shopId])

  return state
}

