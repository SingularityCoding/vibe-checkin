import { afterEach, describe, expect, it } from 'vitest'

import {
  configureRepositories,
  useLocalRepositories,
} from '../../miniprogram/repositories/composition'
import { InMemoryRecordRepository } from '../../miniprogram/repositories/in-memory-record/index'
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
})
