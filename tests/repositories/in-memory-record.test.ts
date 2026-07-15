import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../miniprogram/domain/learning-record'
import { InMemoryRecordRepository } from '../../miniprogram/repositories/in-memory-record/index'
import { FixedClock } from '../../miniprogram/shared/date/clock'

const existingRecord: LearningRecord = {
  id: 'existing',
  date: '2026-07-14',
  createdAt: new Date(2026, 6, 14, 10, 0).getTime(),
  updatedAt: new Date(2026, 6, 14, 10, 5).getTime(),
  content: '已有记录',
  duration: 30,
  tags: ['TDD'],
}

describe('InMemoryRecordRepository', () => {
  it('supports deterministic CRUD without WeChat runtime APIs', async () => {
    const clock = new FixedClock(new Date(2026, 6, 15, 13, 20))
    const repository = new InMemoryRecordRepository([existingRecord], {
      clock,
      idGenerator: () => 'created-in-test',
    })

    const created = await repository.create({
      content: '测试中新建',
      duration: 25,
      tags: ['Vitest'],
    })
    expect(created).toMatchObject({
      id: 'created-in-test',
      date: '2026-07-15',
      createdAt: clock.now().getTime(),
    })

    const updated = await repository.update('existing', {
      content: '测试中更新',
      duration: 40,
      tags: ['Vitest', 'TDD'],
    })
    expect(updated.id).toBe('existing')
    expect(updated.date).toBe('2026-07-14')

    await repository.remove('existing')
    await expect(repository.get('existing')).resolves.toBeNull()
    await expect(repository.list()).resolves.toEqual([created])
  })

  it('does not leak mutable record or tag references', async () => {
    const repository = new InMemoryRecordRepository([existingRecord])
    const records = await repository.list()
    records[0].tags.push('external mutation')
    records[0].content = 'external mutation'

    await expect(repository.get('existing')).resolves.toEqual(existingRecord)
  })

  it('can simulate read failures while keeping write methods explicit', async () => {
    const repository = new InMemoryRecordRepository([], {
      readError: new Error('simulated read failure'),
    })

    await expect(repository.list()).rejects.toThrow('simulated read failure')
    await expect(repository.get('anything')).rejects.toThrow('simulated read failure')
    await expect(repository.reloadFromCloud()).rejects.toThrow('simulated read failure')
  })
})
