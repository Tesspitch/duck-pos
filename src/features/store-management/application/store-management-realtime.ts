export interface StoreManagementRealtime {
  subscribe(shopId: string, onChange: () => void): () => void
}

