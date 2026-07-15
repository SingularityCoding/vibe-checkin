import { describe, expect, it } from 'vitest'

import { preferenceRepository } from '../../miniprogram/repositories/preference'
import { recordRepository } from '../../miniprogram/repositories/record'

describe('starter repository adapters', () => {
  it('returns a safe empty record state', async () => {
    await expect(recordRepository.list()).resolves.toEqual([])
    await expect(recordRepository.get('missing')).resolves.toBeNull()
    await expect(recordRepository.getSyncInfo()).resolves.toMatchObject({ state: 'idle' })
  })

  it('does not pretend that record writes succeeded', async () => {
    await expect(
      recordRepository.create({
        content: '测试记录',
        duration: 30,
        tags: [],
      }),
    ).rejects.toThrow('not available in the starter adapter')
  })

  it('provides the documented default preference', async () => {
    await expect(preferenceRepository.get()).resolves.toEqual({ defaultDuration: 30 })
  })
})
