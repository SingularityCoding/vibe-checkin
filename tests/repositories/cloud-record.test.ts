import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CLOUD_CURRENT_USER_QUERY } from '../../miniprogram/config/cloud'
import {
  CloudRecordRepository,
  type CloudRecordClientPort,
  type CloudRecordCollection,
  type CloudRecordQuery,
} from '../../miniprogram/repositories/cloud-record/index'
import { FixedClock } from '../../miniprogram/shared/date/clock'

type StubDoc = Record<string, unknown> & { _id: string; _openid: string }

type CloudRecordStubOptions = {
  openid?: string
  readError?: unknown
  // 按文档 id 注入删除失败：'reject' 让 doc(id).remove() 抛错，
  // 'no-op' 让它 resolve 但 stats.removed 为 0 且不真正删除。
  failRemoveIds?: Record<string, 'reject' | 'no-op'>
  // 删除永远报告成功但从不真正移除文档——专门用来验证批次安全上限。
  phantomRemove?: boolean
}

// A minimal in-memory fake of the wx.cloud database surface this repository
// depends on. It intentionally mirrors the real security rule
// (`doc._openid == auth.openid`): queries only ever "see" documents whose
// `_openid` matches the fixture's current identity, and `{openid}` in a
// `where` condition resolves to that identity the same way CloudBase would
// resolve it server-side.
const createCloudRecordStub = (options: CloudRecordStubOptions = {}) => {
  const openid = options.openid ?? 'fixture-openid'
  const docs = new Map<string, StubDoc>()
  let nextId = 1

  const resolveCondition = (value: unknown): unknown =>
    value === CLOUD_CURRENT_USER_QUERY ? openid : value

  const matches = (doc: StubDoc, condition: Record<string, unknown>): boolean =>
    Object.entries(condition).every(
      ([key, value]) => doc[key] === resolveCondition(value),
    )

  const whereSpy = vi.fn()
  const limitSpy = vi.fn()

  const makeQuery = (
    condition: Record<string, unknown>,
    max?: number,
  ): CloudRecordQuery => ({
    where: (nextCondition) => {
      whereSpy(nextCondition)
      return makeQuery({ ...condition, ...nextCondition }, max)
    },
    limit: (nextMax) => {
      limitSpy(nextMax)
      return makeQuery(condition, nextMax)
    },
    get: async () => {
      if (options.readError) {
        throw options.readError
      }

      const data = [...docs.values()].filter((doc) => matches(doc, condition))
      return { data: max === undefined ? data : data.slice(0, max) }
    },
  })

  const collection: CloudRecordCollection = {
    ...makeQuery({}),
    doc: (id: string) => ({
      update: async ({ data }) => {
        const existing = docs.get(id)

        if (!existing || existing._openid !== openid) {
          return { stats: { updated: 0 } }
        }

        docs.set(id, { ...existing, ...data, _id: id, _openid: openid })
        return { stats: { updated: 1 } }
      },
      remove: async () => {
        const failMode = options.failRemoveIds?.[id]

        if (failMode === 'reject') {
          throw { errCode: 'REMOVE_FAILED', errMsg: `cannot remove ${id}` }
        }

        const existing = docs.get(id)

        if (failMode === 'no-op' || !existing || existing._openid !== openid) {
          return { stats: { removed: 0 } }
        }

        if (options.phantomRemove) {
          return { stats: { removed: 1 } } // 谎报成功，文档保留
        }

        docs.delete(id)
        return { stats: { removed: 1 } }
      },
    }),
    add: async ({ data }) => {
      const id = `cloud-doc-${nextId++}`
      docs.set(id, { ...data, _id: id, _openid: openid } as StubDoc)
      return { _id: id }
    },
  }

  const collectionSpy = vi.fn(() => collection)
  const database = vi.fn(() => ({ collection: collectionSpy }))
  const cloud: CloudRecordClientPort = { database }

  const seed = (
    data: Record<string, unknown>,
    id?: string,
    ownerOpenid: string = openid,
  ): string => {
    const docId = id ?? `cloud-doc-${nextId++}`
    docs.set(docId, { ...data, _id: docId, _openid: ownerOpenid } as StubDoc)
    return docId
  }

  return { cloud, database, collectionSpy, whereSpy, limitSpy, docs, seed, openid }
}

const baseInput = {
  content: '完成 CloudBase Repository 的 CRUD 实现',
  duration: 45,
  tags: ['CloudBase'],
  takeaway: '安全规则要求显式带上 _openid 条件',
}

describe('CloudRecordRepository', () => {
  let clock: FixedClock

  beforeEach(() => {
    clock = new FixedClock(new Date(2026, 6, 15, 9, 30))
  })

  it('always scopes list and get queries to the current user via {openid}', async () => {
    const stub = createCloudRecordStub()
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

    await repository.list()
    expect(stub.whereSpy).toHaveBeenCalledWith({ _openid: CLOUD_CURRENT_USER_QUERY })

    await repository.get('any-id')
    expect(stub.whereSpy).toHaveBeenCalledWith({
      _id: 'any-id',
      _openid: CLOUD_CURRENT_USER_QUERY,
    })
    expect(stub.limitSpy).toHaveBeenCalledWith(1)
  })

  it('runs a full create / get / update / remove lifecycle without leaking storage fields', async () => {
    const stub = createCloudRecordStub()
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

    const created = await repository.create(baseInput)
    expect(created).not.toHaveProperty('_id')
    expect(created).not.toHaveProperty('_openid')
    expect(created.id).toBeTruthy()
    expect(created.date).toBe('2026-07-15')
    expect(created.createdAt).toBe(clock.now().getTime())
    expect(created.updatedAt).toBe(clock.now().getTime())

    const fetched = await repository.get(created.id)
    expect(fetched).toEqual(created)

    const laterClock = new FixedClock(new Date(2026, 6, 15, 12, 0))
    const repositoryWithLaterClock = new CloudRecordRepository({
      cloud: stub.cloud,
      clock: laterClock,
    })
    const updated = await repositoryWithLaterClock.update(created.id, {
      ...baseInput,
      content: '更新后的学习内容',
    })

    expect(updated.id).toBe(created.id)
    expect(updated.date).toBe(created.date)
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.updatedAt).toBe(laterClock.now().getTime())
    expect(updated.content).toBe('更新后的学习内容')

    await repository.remove(created.id)
    await expect(repository.get(created.id)).resolves.toBeNull()
  })

  it('rejects update and remove for a record that does not exist', async () => {
    const stub = createCloudRecordStub()
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

    await expect(
      repository.update('missing-id', baseInput),
    ).rejects.toThrow('not found')
    await expect(repository.remove('missing-id')).rejects.toThrow('not found')
  })

  it('treats a record owned by a different identity the same as not found', async () => {
    const stub = createCloudRecordStub({ openid: 'me' })
    stub.seed(
      {
        schemaVersion: 1,
        date: '2026-07-01',
        createdAt: 1,
        updatedAt: 1,
        content: '别人的学习记录',
        duration: 30,
        tags: [],
        takeaway: '',
      },
      'not-mine',
      'someone-else',
    )
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

    await expect(repository.get('not-mine')).resolves.toBeNull()
    await expect(repository.update('not-mine', baseInput)).rejects.toThrow('not found')
    await expect(repository.remove('not-mine')).rejects.toThrow('not found')
  })

  it('distinguishes a genuine read failure from a record that simply does not exist', async () => {
    const okStub = createCloudRecordStub()
    const okRepository = new CloudRecordRepository({ cloud: okStub.cloud, clock })
    await expect(okRepository.get('does-not-exist')).resolves.toBeNull()
    await expect(okRepository.list()).resolves.toEqual([])

    const failingStub = createCloudRecordStub({
      readError: { errCode: -1, errMsg: 'network error' },
    })
    const failingRepository = new CloudRecordRepository({
      cloud: failingStub.cloud,
      clock,
    })
    await expect(failingRepository.get('any-id')).rejects.toThrow()
    await expect(failingRepository.list()).rejects.toThrow()
  })

  it('never leaks _openid or raw document content through a rejected promise', async () => {
    const stub = createCloudRecordStub({
      readError: {
        errCode: 'PERMISSION_DENIED',
        _openid: 'private-openid-value',
        data: [{ content: 'private learning record content' }],
      },
    })
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

    await expect(repository.list()).rejects.toMatchObject({
      message: expect.stringContaining('errCode: PERMISSION_DENIED'),
    })

    try {
      await repository.list()
      expect.unreachable()
    } catch (error) {
      const serialized = JSON.stringify({ ...(error as Error), message: (error as Error).message })
      expect(serialized).not.toContain('private-openid-value')
      expect(serialized).not.toContain('private learning record content')
      expect(error).not.toHaveProperty('_openid')
    }
  })

  it('rejects with a clear, static message when CloudBase is unavailable on this device', async () => {
    const repository = new CloudRecordRepository({ cloud: null })

    await expect(repository.list()).rejects.toThrow('unavailable')
    await expect(repository.create(baseInput)).rejects.toThrow('unavailable')
  })

  it('reports sync state transitions across a manual reload', async () => {
    const stub = createCloudRecordStub()
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

    await expect(repository.getSyncInfo()).resolves.toMatchObject({ state: 'idle' })

    await repository.reloadFromCloud()
    await expect(repository.getSyncInfo()).resolves.toMatchObject({
      state: 'synced',
      lastSyncedAt: clock.now().getTime(),
    })

    const failingStub = createCloudRecordStub({ readError: { errCode: -1 } })
    const failingRepository = new CloudRecordRepository({
      cloud: failingStub.cloud,
      clock,
    })

    await expect(failingRepository.reloadFromCloud()).rejects.toThrow()
    await expect(failingRepository.getSyncInfo()).resolves.toMatchObject({
      state: 'failed',
    })
  })

  describe('removeAllMine', () => {
    const seedMineRecords = (
      stub: ReturnType<typeof createCloudRecordStub>,
      count: number,
    ): string[] =>
      Array.from({ length: count }, (_, index) =>
        stub.seed(
          {
            schemaVersion: 1,
            date: '2026-07-10',
            createdAt: index + 1,
            updatedAt: index + 1,
            content: `第 ${index + 1} 条学习记录`,
            duration: 30,
            tags: [],
            takeaway: '',
          },
          `mine-${index + 1}`,
        ),
      )

    it('AC-007: drains all of my records across multiple batches, always scoping by {openid}', async () => {
      const stub = createCloudRecordStub({ openid: 'me' })
      seedMineRecords(stub, 5)
      const repository = new CloudRecordRepository({
        cloud: stub.cloud,
        clock,
        removeAllBatchSize: 2,
      })

      await expect(repository.removeAllMine()).resolves.toBeUndefined()

      // 5 条、每批 2 条：2 + 2 + 1 + 空页，共 4 次分页查询，
      // 每一次查询条件都必须显式限定当前身份。
      expect(stub.whereSpy).toHaveBeenCalledTimes(4)
      for (const call of stub.whereSpy.mock.calls) {
        expect(call[0]).toMatchObject({ _openid: CLOUD_CURRENT_USER_QUERY })
      }
      expect(stub.limitSpy).toHaveBeenCalledWith(2)

      await expect(repository.list()).resolves.toEqual([])
    })

    it('AC-008: never touches documents owned by another identity', async () => {
      const stub = createCloudRecordStub({ openid: 'me' })
      seedMineRecords(stub, 3)
      const otherUsersRecordId = stub.seed(
        {
          schemaVersion: 1,
          date: '2026-07-01',
          createdAt: 1,
          updatedAt: 1,
          content: '别人的学习记录',
          duration: 30,
          tags: [],
          takeaway: '',
        },
        'not-mine',
        'someone-else',
      )
      const repository = new CloudRecordRepository({
        cloud: stub.cloud,
        clock,
        removeAllBatchSize: 2,
      })

      await repository.removeAllMine()

      expect(stub.docs.has(otherUsersRecordId)).toBe(true)
      expect(stub.docs.size).toBe(1)
    })

    it('AC-009: a rejecting per-document delete fails the whole call and keeps the record', async () => {
      const stub = createCloudRecordStub({
        openid: 'me',
        failRemoveIds: { 'mine-2': 'reject' },
      })
      seedMineRecords(stub, 3)
      const repository = new CloudRecordRepository({
        cloud: stub.cloud,
        clock,
        removeAllBatchSize: 2,
      })

      await expect(repository.removeAllMine()).rejects.toThrow(
        'CloudRecordRepository.removeAllMine',
      )
      expect(stub.docs.has('mine-2')).toBe(true)
    })

    it('AC-010: a delete that resolves with stats.removed === 0 also fails the whole call', async () => {
      const stub = createCloudRecordStub({
        openid: 'me',
        failRemoveIds: { 'mine-2': 'no-op' },
      })
      seedMineRecords(stub, 3)
      const repository = new CloudRecordRepository({
        cloud: stub.cloud,
        clock,
        removeAllBatchSize: 2,
      })

      await expect(repository.removeAllMine()).rejects.toThrow(
        'CloudRecordRepository.removeAllMine',
      )
      expect(stub.docs.has('mine-2')).toBe(true)
    })

    it('AC-011: never leaks _openid or document content through a failed batch query', async () => {
      const stub = createCloudRecordStub({
        readError: {
          errCode: 'PERMISSION_DENIED',
          _openid: 'private-openid-value',
          data: [{ content: 'private learning record content' }],
        },
      })
      const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

      try {
        await repository.removeAllMine()
        expect.unreachable()
      } catch (error) {
        const serialized = JSON.stringify({
          ...(error as Error),
          message: (error as Error).message,
        })
        expect((error as Error).message).toContain(
          'CloudRecordRepository.removeAllMine failed to reach CloudBase',
        )
        expect(serialized).not.toContain('private-openid-value')
        expect(serialized).not.toContain('private learning record content')
        expect(error).not.toHaveProperty('_openid')
      }
    })

    it('AC-012: rejects as unavailable when CloudBase is not initialized on this device', async () => {
      const repository = new CloudRecordRepository({ cloud: null })

      await expect(repository.removeAllMine()).rejects.toThrow('unavailable')
    })

    it('REQ-010: stops with an error instead of looping forever when the collection never drains', async () => {
      const stub = createCloudRecordStub({ openid: 'me', phantomRemove: true })
      seedMineRecords(stub, 1)
      const repository = new CloudRecordRepository({
        cloud: stub.cloud,
        clock,
        removeAllBatchSize: 1,
      })

      await expect(repository.removeAllMine()).rejects.toThrow(
        'CloudRecordRepository.removeAllMine failed to reach CloudBase',
      )
    })
  })
})
