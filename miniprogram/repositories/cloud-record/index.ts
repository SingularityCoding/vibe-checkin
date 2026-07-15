import type { LearningRecord, RecordInput } from '../../domain/learning-record'
import type { SyncInfo } from '../../domain/sync-info'
import {
  CLOUD_COLLECTIONS,
  CLOUD_CURRENT_USER_QUERY,
  CLOUD_ENV_ID,
} from '../../config/cloud'
import { SystemClock, type Clock } from '../../shared/date/clock'
import {
  cloneRecord,
  createLearningRecord,
  sortRecordsNewestFirst,
  updateLearningRecord,
  type RecordIdGenerator,
} from '../record-data'
import type { RecordRepository } from '../record-repository'
import {
  mapCloudDocumentToLearningRecord,
  mapLearningRecordToCloudData,
} from './document'

/**
 * Narrow structural subset of the `wx.cloud` database API this repository
 * depends on. A real `wx.cloud` object satisfies this port structurally (it
 * simply has more methods than we use), and tests can supply a lightweight
 * fake without pulling in the Mini Program SDK.
 */
export type CloudRecordDocumentRef = {
  update(options: {
    data: Record<string, unknown>
  }): Promise<{ stats: { updated: number } }>
  remove(): Promise<{ stats: { removed: number } }>
}

export type CloudRecordQuery = {
  where(condition: Record<string, unknown>): CloudRecordQuery
  limit(max: number): CloudRecordQuery
  get(): Promise<{ data: unknown[] }>
}

export type CloudRecordCollection = CloudRecordQuery & {
  doc(id: string): CloudRecordDocumentRef
  add(options: {
    data: Record<string, unknown>
  }): Promise<{ _id: string | number }>
}

export type CloudRecordDatabase = {
  collection(name: string): CloudRecordCollection
}

export type CloudRecordClientPort = {
  database(config: { env: string }): CloudRecordDatabase
}

export type CloudRecordRepositoryOptions = {
  cloud?: CloudRecordClientPort | null
  clock?: Clock
  removeAllBatchSize?: number
}

// CloudBase has no "delete by query" call, so removeAllMine() pages through
// the current user's records and deletes them one document at a time. The
// batch size keeps each query under platform limits (tests shrink it to
// cover the multi-batch loop cheaply); the batch cap is a safety net against
// an endless loop if the collection somehow never drains.
const REMOVE_ALL_DEFAULT_BATCH_SIZE = 20
const REMOVE_ALL_MAX_BATCHES = 1000

// The document's real `id` always comes back from CloudBase's own `_id` once
// `add()` resolves (see `document.ts`: write payloads never include `_id`).
// This placeholder only satisfies `createLearningRecord`'s signature so we
// can reuse its validation and field generation; it is never sent to the
// cloud (`mapLearningRecordToCloudData` drops `id`) or returned to callers.
const CLOUD_PENDING_ID_PLACEHOLDER: RecordIdGenerator = () => 'pending'

const CLOUD_UNAVAILABLE_MESSAGE =
  'CloudRecordRepository is unavailable because 微信云开发 is not initialized on this device.'

const resolveCloudClient = (
  cloud: CloudRecordClientPort | null | undefined,
): CloudRecordClientPort | null => {
  if (cloud !== undefined) {
    return cloud
  }

  if (typeof wx === 'undefined' || typeof wx.cloud === 'undefined') {
    return null
  }

  return wx.cloud
}

const extractErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  const candidate = error as { errCode?: unknown; code?: unknown }
  const code = candidate.errCode ?? candidate.code

  if (typeof code === 'string' || typeof code === 'number') {
    return String(code)
  }

  return undefined
}

// Cloud SDK errors can carry request context (query conditions, sometimes an
// echoed payload). Never forward the raw error to a caller: rebuild a static
// message plus an optional error code so `_openid` and document content can
// never leak through a rejected promise.
const toCloudFailure = (method: string, error: unknown): Error => {
  const code = extractErrorCode(error)
  return new Error(
    `CloudRecordRepository.${method} failed to reach CloudBase${
      code ? ` (errCode: ${code})` : ''
    }`,
  )
}

const notFound = (id: string): Error =>
  new Error(`Learning record not found: ${id}`)

export class CloudRecordRepository implements RecordRepository {
  private readonly cloud: CloudRecordClientPort | null
  private readonly clock: Clock
  private readonly removeAllBatchSize: number
  private syncInfo: SyncInfo

  constructor(options: CloudRecordRepositoryOptions = {}) {
    this.cloud = resolveCloudClient(options.cloud)
    this.clock = options.clock ?? new SystemClock()
    this.removeAllBatchSize =
      options.removeAllBatchSize ?? REMOVE_ALL_DEFAULT_BATCH_SIZE
    this.syncInfo = { state: 'idle', message: '尚未从云端同步' }
  }

  async list(): Promise<LearningRecord[]> {
    const collection = this.collection()
    let result: { data: unknown[] }

    try {
      result = await collection
        .where({ _openid: CLOUD_CURRENT_USER_QUERY })
        .get()
    } catch (error) {
      throw toCloudFailure('list', error)
    }

    return sortRecordsNewestFirst(
      result.data.map((doc) => mapCloudDocumentToLearningRecord(doc)),
    )
  }

  async get(id: string): Promise<LearningRecord | null> {
    const collection = this.collection()
    let result: { data: unknown[] }

    try {
      result = await collection
        .where({ _id: id, _openid: CLOUD_CURRENT_USER_QUERY })
        .limit(1)
        .get()
    } catch (error) {
      throw toCloudFailure('get', error)
    }

    if (result.data.length === 0) {
      return null
    }

    return mapCloudDocumentToLearningRecord(result.data[0])
  }

  async create(input: RecordInput): Promise<LearningRecord> {
    const collection = this.collection()
    const draft = createLearningRecord(
      input,
      this.clock,
      CLOUD_PENDING_ID_PLACEHOLDER,
    )
    const writeData = mapLearningRecordToCloudData(draft)

    let result: { _id: string | number }

    try {
      result = await collection.add({ data: writeData })
    } catch (error) {
      throw toCloudFailure('create', error)
    }

    return cloneRecord({ ...draft, id: String(result._id) })
  }

  async update(id: string, input: RecordInput): Promise<LearningRecord> {
    const existing = await this.get(id)

    if (existing === null) {
      throw notFound(id)
    }

    const updated = updateLearningRecord(existing, input, this.clock)
    const writeData = mapLearningRecordToCloudData(updated)
    const collection = this.collection()

    let result: { stats: { updated: number } }

    try {
      result = await collection.doc(id).update({ data: writeData })
    } catch (error) {
      throw toCloudFailure('update', error)
    }

    if (result.stats.updated === 0) {
      throw notFound(id)
    }

    return cloneRecord(updated)
  }

  async remove(id: string): Promise<void> {
    const existing = await this.get(id)

    if (existing === null) {
      throw notFound(id)
    }

    const collection = this.collection()
    let result: { stats: { removed: number } }

    try {
      result = await collection.doc(id).remove()
    } catch (error) {
      throw toCloudFailure('remove', error)
    }

    if (result.stats.removed === 0) {
      throw notFound(id)
    }
  }

  async removeAllMine(): Promise<void> {
    const collection = this.collection()

    for (let batch = 0; batch < REMOVE_ALL_MAX_BATCHES; batch += 1) {
      let page: { data: unknown[] }

      try {
        page = await collection
          .where({ _openid: CLOUD_CURRENT_USER_QUERY })
          .limit(this.removeAllBatchSize)
          .get()
      } catch (error) {
        throw toCloudFailure('removeAllMine', error)
      }

      if (page.data.length === 0) {
        return // 当前用户的集合已经清空
      }

      // 任意一条删除失败都让整个调用 reject：对用户而言"删除全部记录"
      // 是全有或全无的承诺，报告部分成功比什么都不做更糟。重试时重新
      // 查询会天然从真正剩下的数据继续，不需要在这里记账进度。
      await Promise.all(
        page.data.map((doc) => this.removeOneMineDocument(collection, doc)),
      )
    }

    throw toCloudFailure(
      'removeAllMine',
      new Error('Exceeded the maximum number of delete batches'),
    )
  }

  async reloadFromCloud(): Promise<LearningRecord[]> {
    const previousSyncedAt = this.syncInfo.lastSyncedAt

    try {
      const records = await this.list()

      this.syncInfo = {
        state: 'synced',
        lastSyncedAt: this.clock.now().getTime(),
        message: '已从云端同步',
      }

      return records
    } catch (error) {
      this.syncInfo = {
        state: 'failed',
        lastSyncedAt: previousSyncedAt,
        message: '云端同步失败，请检查网络后重试',
      }

      throw error
    }
  }

  async getSyncInfo(): Promise<SyncInfo> {
    return { ...this.syncInfo }
  }

  private collection(): CloudRecordCollection {
    if (!this.cloud) {
      throw new Error(CLOUD_UNAVAILABLE_MESSAGE)
    }

    return this.cloud
      .database({ env: CLOUD_ENV_ID })
      .collection(CLOUD_COLLECTIONS.learningRecords)
  }

  private async removeOneMineDocument(
    collection: CloudRecordCollection,
    doc: unknown,
  ): Promise<void> {
    // 只需要 _id 来定位删除目标；文档内容与 _openid 一概不读取、不转发。
    const id =
      typeof doc === 'object' && doc !== null
        ? (doc as { _id?: unknown })._id
        : undefined

    if (typeof id !== 'string' && typeof id !== 'number') {
      throw toCloudFailure(
        'removeAllMine',
        new Error('Cloud document is missing an _id'),
      )
    }

    let result: { stats: { removed: number } }

    try {
      result = await collection.doc(String(id)).remove()
    } catch (error) {
      throw toCloudFailure('removeAllMine', error)
    }

    // resolve 但一条都没删掉（并发变化、安全规则拒绝等）同样视为失败，
    // 不能把这一批标记为部分成功。
    if (result.stats.removed === 0) {
      throw toCloudFailure(
        'removeAllMine',
        new Error('CloudBase reported zero removed documents'),
      )
    }
  }
}
