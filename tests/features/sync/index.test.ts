import { describe, expect, it } from 'vitest'

import { formatSyncInfo } from '../../../miniprogram/features/sync/index'

describe('formatSyncInfo', () => {
  it('maps idle and syncing states to a neutral view model', () => {
    expect(formatSyncInfo({ state: 'idle', message: '尚未从云端同步' })).toEqual({
      state: 'neutral',
      text: '尚未从云端同步',
    })

    expect(formatSyncInfo({ state: 'syncing', message: '正在重新同步' })).toEqual({
      state: 'neutral',
      text: '正在重新同步',
    })
  })

  it('maps synced to success and failed to error', () => {
    expect(formatSyncInfo({ state: 'synced', message: '已从云端同步' })).toEqual({
      state: 'success',
      text: '已从云端同步',
    })

    expect(
      formatSyncInfo({ state: 'failed', message: '云端同步失败，请检查网络后重试' }),
    ).toEqual({
      state: 'error',
      text: '云端同步失败，请检查网络后重试',
    })
  })

  it('falls back to a default text when no message is provided', () => {
    expect(formatSyncInfo({ state: 'idle' })).toEqual({
      state: 'neutral',
      text: '当前未进行同步',
    })
  })
})
