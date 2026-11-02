import { useEffect } from 'react'
import { useCustomerTrackingStore } from './customer-tracking-store'
import { legacyTrackingKey, trackingRecordPrefix, trackingSelectionPrefix } from '../infrastructure/customer-tracking-storage'

export function useCustomerTrackingSync() {
  useEffect(() => {
    const refresh = () => useCustomerTrackingStore.getState().refresh()
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === null || event.key === legacyTrackingKey
        || event.key.startsWith(trackingRecordPrefix) || event.key.startsWith(trackingSelectionPrefix))) refresh()
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}
