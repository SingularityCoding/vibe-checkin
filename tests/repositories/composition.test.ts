import { afterEach, describe, expect, it } from 'vitest'

import { CloudRecordRepository } from '../../miniprogram/repositories/cloud-record/index'
import {
  configureRepositories,
  getCloudRepositories,
  getLocalRepositories,
  useCloudRepositories,
  useLocalRepositories,
} from '../../miniprogram/repositories/composition'
import { InMemoryRecordRepository } from '../../miniprogram/repositories/in-memory-record/index'
import { LocalRecordRepository } from '../../miniprogram/repositories/local-record/index'
import { recordRepository } from '../../miniprogram/repositories/record'
import { FixedClock } from '../../miniprogram/shared/date/clock'

afterEach(() => {
  useLocalRepositories()
})

describe('repository composition', () => {
  it('keeps the page-facing proxy stable when a test injects In-memory', async () => {
    const injected = new InMemoryRecordRepository([], {
      clock: new FixedClock(new Date(2026, 6, 15, 10, 0)),
      idGenerator: () => 'injected-record',
    })
    configureRepositories({ record: injected })

    const created = await recordRepository.create({
      content: '通过组合入口写入',
      duration: 30,
      tags: ['Composition'],
    })

    expect(created.id).toBe('injected-record')
    await expect(recordRepository.list()).resolves.toEqual([created])
  })

  it('exposes an explicit switch to Cloud repositories that leaves preferences local', async () => {
    expect(getLocalRepositories().record).toBeInstanceOf(LocalRecordRepository)
    expect(getCloudRepositories().record).toBeInstanceOf(CloudRecordRepository)
    expect(getCloudRepositories().preference).toBe(getLocalRepositories().preference)

    useCloudRepositories()
    // Vitest runs outside a Mini Program host, so `wx.cloud` never exists
    // here; the composed Cloud repository must still fail honestly instead
    // of silently returning Local/In-memory data.
    await expect(recordRepository.list()).rejects.toThrow('unavailable')
  })
})
