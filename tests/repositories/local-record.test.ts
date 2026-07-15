import { describe, expect, it } from 'vitest'

import { FixedClock } from '../../miniprogram/shared/date/clock'
import { LocalRecordRepository } from '../../miniprogram/repositories/local-record/index'
import { TestStorage } from './test-storage'

const firstClock = new FixedClock(new Date(2026, 6, 15, 9, 30))
const laterClock = new FixedClock(new Date(2026, 6, 15, 11, 45))

describe('LocalRecordRepository', () => {
  it('generates ID and local time fields when creating a record', async () => {
    const storage = new TestStorage()
    const repository = new LocalRecordRepository({
      storage,
      clock: firstClock,
      idGenerator: () => 'record-001',
    })
    const tags = ['TypeScript', 'TDD']

    const created = await repository.create({
      content: '实现本地 Repository',
      duration: 45,
      tags,
    })
    tags.push('later mutation')

    expect(created).toEqual({
      id: 'record-001',
      date: '2026-07-15',
      createdAt: firstClock.now().getTime(),
      updatedAt: firstClock.now().getTime(),
      content: '实现本地 Repository',
      duration: 45,
      tags: ['TypeScript', 'TDD'],
    })
    await expect(repository.list()).resolves.toEqual([created])
  })

  it('persists records and returns defensive copies', async () => {
    const storage = new TestStorage()
    const first = new LocalRecordRepository({
      storage,
      clock: firstClock,
      idGenerator: () => 'persisted-record',
    })
    const created = await first.create({
      content: '验证本地持久化',
      duration: 30,
      tags: ['Storage'],
    })
    created.tags.push('external mutation')

    const reopened = new LocalRecordRepository({ storage, clock: firstClock })
    const loaded = await reopened.get('persisted-record')

    expect(loaded?.tags).toEqual(['Storage'])
    loaded?.tags.push('another mutation')
    await expect(reopened.get('persisted-record')).resolves.toMatchObject({
      tags: ['Storage'],
    })
  })

  it('updates editable fields while preserving record identity and creation fields', async () => {
    const storage = new TestStorage()
    const creator = new LocalRecordRepository({
      storage,
      clock: firstClock,
      idGenerator: () => 'record-to-update',
    })
    const created = await creator.create({
      content: '初始内容',
      duration: 20,
      tags: ['初始'],
    })
    const updater = new LocalRecordRepository({ storage, clock: laterClock })

    const updated = await updater.update(created.id, {
      content: '更新后的内容',
      duration: 50,
      tags: ['更新'],
      takeaway: '保留创建字段，只改变可编辑内容。',
    })

    expect(updated).toMatchObject({
      id: created.id,
      date: created.date,
      createdAt: created.createdAt,
      updatedAt: laterClock.now().getTime(),
      content: '更新后的内容',
      duration: 50,
      tags: ['更新'],
    })
  })

  it('deletes one or all records and rejects unknown IDs', async () => {
    const storage = new TestStorage()
    let sequence = 0
    const repository = new LocalRecordRepository({
      storage,
      clock: firstClock,
      idGenerator: () => `record-${++sequence}`,
    })

    const first = await repository.create({ content: '第一条', duration: 10, tags: [] })
    await repository.create({ content: '第二条', duration: 20, tags: [] })
    await repository.remove(first.id)

    await expect(repository.list()).resolves.toHaveLength(1)
    await expect(repository.remove('missing')).rejects.toThrow('not found')

    await repository.removeAllMine()
    await expect(repository.reloadFromCloud()).resolves.toEqual([])
  })

  it('rejects corrupt local data instead of treating it as an empty state', async () => {
    const storage = new TestStorage()
    storage.set('vibe-checkin.records.v1', { version: 1, records: [{ id: 'broken' }] })
    const repository = new LocalRecordRepository({ storage })

    await expect(repository.list()).rejects.toThrow('unreadable')
  })
})
