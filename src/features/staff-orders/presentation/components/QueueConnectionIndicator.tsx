import type { RealtimeConnectionState } from '../../application/staff-orders-realtime'

const labels: Record<RealtimeConnectionState, string> = {
  CONNECTED: 'เชื่อมต่อคิวแล้ว', CONNECTING: 'กำลังเชื่อมต่อคิว',
  RECONNECTING: 'กำลังเชื่อมต่อคิวใหม่', DISCONNECTED: 'การเชื่อมต่อคิวขัดข้อง',
}

export function QueueConnectionIndicator({ state }: { state: RealtimeConnectionState }) {
  const tone = state === 'CONNECTED' ? 'connected' : state === 'DISCONNECTED' ? 'disconnected' : 'connecting'
  return <span role="status" aria-label={labels[state]} title={labels[state]} className="queue-connection-indicator">
    <span aria-hidden="true" className={`queue-connection-dot ${tone}`} />
  </span>
}
