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
}

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
  private syncInfo: SyncInfo

  constructor(options: CloudRecordRepositoryOptions = {}) {
    this.cloud = resolveCloudClient(options.cloud)
    this.clock = options.clock ?? new SystemClock()
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

  removeAllMine(): Promise<void> {
    // CloudBase batch delete ships with P2-08. Keep this an explicit,
    // honest rejection so nothing accidentally treats a partial or fake
    // success as "all of my records are gone".
    return Promise.reject(
      new Error(
        'CloudRecordRepository.removeAllMine is not supported yet. Batched CloudBase delete is the P2-08 deliverable.',
      ),
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
}
