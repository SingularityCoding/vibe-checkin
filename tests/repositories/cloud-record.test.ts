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

  const makeQuery = (condition: Record<string, unknown>): CloudRecordQuery => ({
    where: (nextCondition) => {
      whereSpy(nextCondition)
      return makeQuery({ ...condition, ...nextCondition })
    },
    limit: (max) => {
      limitSpy(max)
      return makeQuery(condition)
    },
    get: async () => {
      if (options.readError) {
        throw options.readError
      }

      return { data: [...docs.values()].filter((doc) => matches(doc, condition)) }
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
        const existing = docs.get(id)

        if (!existing || existing._openid !== openid) {
          return { stats: { removed: 0 } }
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

  it('keeps removeAllMine an explicit "not supported yet" rejection', async () => {
    const stub = createCloudRecordStub()
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

    await expect(repository.removeAllMine()).rejects.toThrow('not supported')
  })
})
