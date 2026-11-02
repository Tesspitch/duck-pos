export type RealtimeConnectionState = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'

export interface StaffOrdersRealtime {
  subscribe(
    shopId: string,
    onChange: () => void,
    onConnectionState: (state: RealtimeConnectionState) => void,
  ): () => void
}

