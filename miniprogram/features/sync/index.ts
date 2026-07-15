import type { SyncInfo } from '../../domain/sync-info'

export type SyncInfoViewModel = {
  state: 'neutral' | 'success' | 'error'
  text: string
}

export const formatSyncInfo = (info: SyncInfo): SyncInfoViewModel => ({
  state: info.state === 'failed' ? 'error' : info.state === 'synced' ? 'success' : 'neutral',
  text: info.message ?? '当前未进行同步',
})
