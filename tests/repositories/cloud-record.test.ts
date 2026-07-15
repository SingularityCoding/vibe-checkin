import { describe, expect, it } from 'vitest'

import {
  CLOUD_COLLECTIONS,
  CLOUD_CURRENT_USER_QUERY,
  CLOUD_ENV_ID,
  CLOUD_RECORD_SCHEMA_VERSION,
} from '../../miniprogram/config/cloud'
import type { CloudLearningRecordDocument } from '../../miniprogram/repositories/cloud-record/document'
import {
  CloudRecordRepository,
  type CloudRecordClientPort,
  type CloudRecordCollection,
  type CloudRecordQuery,
} from '../../miniprogram/repositories/cloud-record/index'
import { FixedClock } from '../../miniprogram/shared/date/clock'

// 测试固定的"当前微信身份"：stub 会像真实安全规则一样，
// 把查询条件里的 '{openid}' 解析为这个值。
const OPENID_ME = 'openid-me'
const OPENID_SOMEONE_ELSE = 'openid-someone-else'

const seedDocument = (
  overrides: Partial<CloudLearningRecordDocument> = {},
): CloudLearningRecordDocument => ({
  _id: 'seed-record-1',
  _openid: OPENID_ME,
  schemaVersion: CLOUD_RECORD_SCHEMA_VERSION,
  date: '2026-07-14',
  createdAt: new Date(2026, 6, 14, 9, 0).getTime(),
  updatedAt: new Date(2026, 6, 14, 9, 0).getTime(),
  content: '预置的学习记录',
  duration: 30,
  tags: ['预置'],
  takeaway: '',
  ...overrides,
})

type CloudRecordStubOptions = {
  seed?: CloudLearningRecordDocument[]
  readError?: unknown
  // 模拟并发场景：先读成功、随后的写操作却落空（stats 为 0）。
  forceEmptyWrites?: boolean
}

// 最小的内存 wx.cloud fake：where 条件里的 '{openid}' 解析为固定的
// fixture 身份，跨身份文档不会出现在查询结果里——刻意模拟真实安全规则。
const createCloudRecordStub = (options: CloudRecordStubOptions = {}) => {
  const documents = (options.seed ?? []).map((document) => ({
    ...document,
    tags: [...document.tags],
  }))
  let readError = options.readError
  let nextId = 1
  const whereCalls: Record<string, unknown>[] = []
  const limitCalls: number[] = []
  const databaseEnvs: string[] = []
  const collectionNames: string[] = []

  const matches = (
    document: CloudLearningRecordDocument,
    condition: Record<string, unknown>,
  ): boolean =>
    Object.entries(condition).every(([key, value]) => {
      const expected = value === CLOUD_CURRENT_USER_QUERY ? OPENID_ME : value
      return document[key as keyof CloudLearningRecordDocument] === expected
    })

  const createQuery = (
    condition: Record<string, unknown>,
    max: number | undefined,
  ): CloudRecordQuery => ({
    where(next) {
      whereCalls.push(next)
      return createQuery({ ...condition, ...next }, max)
    },
    limit(value) {
      limitCalls.push(value)
      return createQuery(condition, value)
    },
    async get() {
      if (readError !== undefined) {
        throw readError
      }

      const data = documents
        .filter((document) => matches(document, condition))
        .map((document) => ({ ...document, tags: [...document.tags] }))

      return { data: max === undefined ? data : data.slice(0, max) }
    },
  })

  const collection: CloudRecordCollection = {
    ...createQuery({}, undefined),
    doc(id) {
      return {
        async update({ data }) {
          const document = documents.find(
            (item) => item._id === id && item._openid === OPENID_ME,
          )

          if (!document || options.forceEmptyWrites) {
            return { stats: { updated: 0 } }
          }

          Object.assign(document, data)
          return { stats: { updated: 1 } }
        },
        async remove() {
          const index = documents.findIndex(
            (item) => item._id === id && item._openid === OPENID_ME,
          )

          if (index === -1 || options.forceEmptyWrites) {
            return { stats: { removed: 0 } }
          }

          documents.splice(index, 1)
          return { stats: { removed: 1 } }
        },
      }
    },
    async add({ data }) {
      const _id = `cloud-record-${nextId}`
      nextId += 1
      documents.push({
        ...(data as Omit<CloudLearningRecordDocument, '_id' | '_openid'>),
        _id,
        _openid: OPENID_ME,
      })
      return { _id }
    },
  }

  const cloud: CloudRecordClientPort = {
    database({ env }) {
      databaseEnvs.push(env)
      return {
        collection(name) {
          collectionNames.push(name)
          return collection
        },
      }
    },
  }

  return {
    cloud,
    documents,
    whereCalls,
    limitCalls,
    databaseEnvs,
    collectionNames,
    setReadError(error: unknown) {
      readError = error
    },
  }
}

const clockAt = (hour: number, minute = 0) =>
  new FixedClock(new Date(2026, 6, 15, hour, minute))

const validInput = { content: '学习了云端同步', duration: 30, tags: ['云端'] }

describe('CloudRecordRepository', () => {
  it('AC-001: list 与 get 都显式限定当前身份，get 额外 limit(1)', async () => {
    const stub = createCloudRecordStub()
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock: clockAt(10) })

    await repository.list()
    await repository.get('any-id')

    expect(stub.whereCalls).toEqual([
      { _openid: CLOUD_CURRENT_USER_QUERY },
      { _id: 'any-id', _openid: CLOUD_CURRENT_USER_QUERY },
    ])
    expect(stub.limitCalls).toEqual([1])
    expect(stub.databaseEnvs.every((env) => env === CLOUD_ENV_ID)).toBe(true)
    expect(
      stub.collectionNames.every((name) => name === CLOUD_COLLECTIONS.learningRecords),
    ).toBe(true)
  })

  it('AC-002: create → get → update（更晚的 Clock）→ remove → get 全生命周期', async () => {
    const stub = createCloudRecordStub()
    const createClock = clockAt(9)
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock: createClock })

    const created = await repository.create({ ...validInput, takeaway: '有收获' })

    expect(created).not.toHaveProperty('_id')
    expect(created).not.toHaveProperty('_openid')
    expect(created.id).toBe('cloud-record-1')
    expect(created.date).toBe('2026-07-15')
    expect(created.createdAt).toBe(createClock.now().getTime())
    expect(created.updatedAt).toBe(createClock.now().getTime())

    await expect(repository.get(created.id)).resolves.toEqual(created)

    const updateClock = clockAt(11)
    const laterRepository = new CloudRecordRepository({
      cloud: stub.cloud,
      clock: updateClock,
    })
    const updated = await laterRepository.update(created.id, {
      content: '更新后的云端内容',
      duration: 60,
      tags: ['云端'],
      takeaway: '有收获',
    })

    expect(updated.id).toBe(created.id)
    expect(updated.date).toBe(created.date)
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.content).toBe('更新后的云端内容')
    expect(updated.updatedAt).toBe(updateClock.now().getTime())
    expect(updated).not.toHaveProperty('_openid')

    await laterRepository.remove(created.id)
    await expect(laterRepository.get(created.id)).resolves.toBeNull()
  })

  it('AC-003: 不存在的 id 让 update 与 remove 以 "not found" 拒绝', async () => {
    const stub = createCloudRecordStub()
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock: clockAt(10) })

    await expect(repository.update('missing-id', validInput)).rejects.toThrow('not found')
    await expect(repository.remove('missing-id')).rejects.toThrow('not found')
  })

  it('AC-004: 他人身份的记录与"记录不存在"不可区分', async () => {
    const stub = createCloudRecordStub({
      seed: [seedDocument({ _id: 'someone-elses-record', _openid: OPENID_SOMEONE_ELSE })],
    })
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock: clockAt(10) })

    await expect(repository.get('someone-elses-record')).resolves.toBeNull()
    await expect(repository.update('someone-elses-record', validInput)).rejects.toThrow(
      'not found',
    )
    await expect(repository.remove('someone-elses-record')).rejects.toThrow('not found')
    await expect(repository.list()).resolves.toEqual([])
  })

  it('AC-005: 读取失败必须 reject，记录不存在必须 resolve 为 null', async () => {
    const healthy = createCloudRecordStub()
    const healthyRepository = new CloudRecordRepository({
      cloud: healthy.cloud,
      clock: clockAt(10),
    })
    await expect(healthyRepository.get('missing-id')).resolves.toBeNull()

    const broken = createCloudRecordStub({ readError: new Error('network down') })
    const brokenRepository = new CloudRecordRepository({
      cloud: broken.cloud,
      clock: clockAt(10),
    })
    await expect(brokenRepository.get('missing-id')).rejects.toThrow(
      'failed to reach CloudBase',
    )
    await expect(brokenRepository.list()).rejects.toThrow('failed to reach CloudBase')
  })

  it('AC-006: 错误重建不泄露 _openid 与文档内容', async () => {
    const stub = createCloudRecordStub({
      readError: {
        errCode: 'PERMISSION_DENIED',
        _openid: 'private-openid-value',
        data: [{ content: 'private learning record content' }],
      },
    })
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock: clockAt(10) })

    const error = await repository.list().then(
      () => {
        throw new Error('list should have rejected')
      },
      (caught: unknown) => caught as Error,
    )

    expect(error.message).toBe(
      'CloudRecordRepository.list failed to reach CloudBase (errCode: PERMISSION_DENIED)',
    )
    expect(error).not.toHaveProperty('_openid')

    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error))
    expect(serialized).not.toContain('private-openid-value')
    expect(serialized).not.toContain('private learning record content')
  })

  it('AC-007: 设备未初始化云开发时，访问 collection 的方法以 "unavailable" 拒绝', async () => {
    const repository = new CloudRecordRepository({ cloud: null, clock: clockAt(10) })

    await expect(repository.list()).rejects.toThrow('unavailable')
    await expect(repository.create(validInput)).rejects.toThrow('unavailable')
    await expect(repository.reloadFromCloud()).rejects.toThrow('unavailable')
  })

  it('AC-008: reloadFromCloud 成功与失败驱动 syncInfo 状态机', async () => {
    const stub = createCloudRecordStub({ seed: [seedDocument()] })
    const clock = clockAt(10)
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

    await expect(repository.getSyncInfo()).resolves.toEqual({
      state: 'idle',
      message: '尚未从云端同步',
    })

    const reloaded = await repository.reloadFromCloud()
    expect(reloaded).toHaveLength(1)
    await expect(repository.getSyncInfo()).resolves.toEqual({
      state: 'synced',
      lastSyncedAt: clock.now().getTime(),
      message: '已从云端同步',
    })

    const broken = createCloudRecordStub({ readError: new Error('network down') })
    const brokenRepository = new CloudRecordRepository({
      cloud: broken.cloud,
      clock: clockAt(10),
    })
    await expect(brokenRepository.reloadFromCloud()).rejects.toThrow(
      'failed to reach CloudBase',
    )
    await expect(brokenRepository.getSyncInfo()).resolves.toEqual({
      state: 'failed',
      message: '云端同步失败，请检查网络后重试',
    })
  })

  it('AC-008 补充: 同步失败保留上一次成功同步的时间', async () => {
    const stub = createCloudRecordStub({ seed: [seedDocument()] })
    const clock = clockAt(10)
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

    await repository.reloadFromCloud()
    const synced = await repository.getSyncInfo()

    stub.setReadError(new Error('network down'))
    await expect(repository.reloadFromCloud()).rejects.toThrow('failed to reach CloudBase')

    await expect(repository.getSyncInfo()).resolves.toEqual({
      state: 'failed',
      lastSyncedAt: synced.lastSyncedAt,
      message: '云端同步失败，请检查网络后重试',
    })
  })

  it('REQ-009: getSyncInfo 返回浅拷贝，外部修改不影响内部状态', async () => {
    const repository = new CloudRecordRepository({ cloud: null, clock: clockAt(10) })

    const first = await repository.getSyncInfo()
    first.state = 'synced'
    first.message = '被外部篡改'

    await expect(repository.getSyncInfo()).resolves.toEqual({
      state: 'idle',
      message: '尚未从云端同步',
    })
  })

  it('AC-009: removeAllMine 保持显式的 "not supported" 拒绝（P2-08 交付物）', async () => {
    const stub = createCloudRecordStub({ seed: [seedDocument()] })
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock: clockAt(10) })

    await expect(repository.removeAllMine()).rejects.toThrow('not supported')
    expect(stub.documents).toHaveLength(1)
  })

  it('REQ-005/006: 写操作 stats 为 0 时同样以 "not found" 拒绝，不误报成功', async () => {
    const stub = createCloudRecordStub({
      seed: [seedDocument()],
      forceEmptyWrites: true,
    })
    const repository = new CloudRecordRepository({ cloud: stub.cloud, clock: clockAt(10) })

    await expect(repository.update('seed-record-1', validInput)).rejects.toThrow('not found')
    await expect(repository.remove('seed-record-1')).rejects.toThrow('not found')
  })
})
