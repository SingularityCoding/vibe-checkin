import { describe, expect, it } from 'vitest'

import { formatSyncInfo } from '../../../miniprogram/features/sync/index'

describe('formatSyncInfo', () => {
  it('AC-010: 把四种同步状态映射为组件可渲染的视觉状态', () => {
    expect(formatSyncInfo({ state: 'idle', message: '尚未从云端同步' })).toEqual({
      state: 'neutral',
      text: '尚未从云端同步',
    })
    expect(formatSyncInfo({ state: 'syncing', message: '正在重新同步' })).toEqual({
      state: 'neutral',
      text: '正在重新同步',
    })
    expect(
      formatSyncInfo({ state: 'synced', lastSyncedAt: 1_700_000_000_000, message: '已从云端同步' }),
    ).toEqual({
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

  it('AC-010: message 缺省时回退为固定文案', () => {
    expect(formatSyncInfo({ state: 'idle' })).toEqual({
      state: 'neutral',
      text: '当前未进行同步',
    })
    expect(formatSyncInfo({ state: 'synced' })).toEqual({
      state: 'success',
      text: '当前未进行同步',
    })
  })
})
