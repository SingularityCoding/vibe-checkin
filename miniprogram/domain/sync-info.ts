export type SyncState = 'idle' | 'syncing' | 'synced' | 'failed'

export type SyncInfo = {
  state: SyncState
  lastSyncedAt?: number
  message?: string
}
