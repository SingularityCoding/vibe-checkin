import {
  CLOUD_COLLECTIONS,
  CLOUD_CURRENT_USER_QUERY,
  CLOUD_ENV_ID,
} from '../../config/cloud'
import type { LearningRecord, RecordInput } from '../../domain/learning-record'
import type { SyncInfo } from '../../domain/sync-info'
import { SystemClock, type Clock } from '../../shared/date/clock'
import {
  createLearningRecord,
  generateRecordId,
  sortRecordsNewestFirst,
  updateLearningRecord,
} from '../record-data'
import type { RecordRepository } from '../record-repository'
import {
  mapCloudDocumentToLearningRecord,
  mapLearningRecordToCloudData,
} from './document'

// 结构化端口：真实 wx.cloud 结构性满足它，测试注入轻量 fake。
export type CloudRecordDocumentRef = {
  update(options: { data: Record<string, unknown> }): Promise<{ stats: { updated: number } }>
  remove(): Promise<{ stats: { removed: number } }>
}

export type CloudRecordQuery = {
  where(condition: Record<string, unknown>): CloudRecordQuery
  limit(max: number): CloudRecordQuery
  get(): Promise<{ data: unknown[] }>
}

export type CloudRecordCollection = CloudRecordQuery & {
  doc(id: string): CloudRecordDocumentRef
  add(options: { data: Record<string, unknown> }): Promise<{ _id: string | number }>
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

const resolveCloudClient = (): CloudRecordClientPort | null => {
  if (typeof wx === 'undefined' || typeof wx.cloud === 'undefined') {
    return null
  }

  return wx.cloud
}

const unavailable = (method: string): Error =>
  new Error(
    `CloudRecordRepository.${method} is unavailable because 微信云开发 is not initialized on this device`,
  )

const notFound = (id: string): Error => new Error(`Learning record not found: ${id}`)

// 静态错误重建：CloudBase SDK 抛出的原始错误可能携带查询条件、_openid
// 甚至回显的文档内容。这里只保留方法名与可选 errCode，绝不引用原始
// error 对象，防止隐私数据通过日志或 JSON.stringify 泄露。
const toCloudFailure = (method: string, error: unknown): Error => {
  let suffix = ''

  if (typeof error === 'object' && error !== null) {
    const errCode = (error as { errCode?: unknown }).errCode

    if (typeof errCode === 'string' || typeof errCode === 'number') {
      suffix = ` (errCode: ${errCode})`
    }
  }

  return new Error(`CloudRecordRepository.${method} failed to reach CloudBase${suffix}`)
}

export class CloudRecordRepository implements RecordRepository {
  private readonly cloud: CloudRecordClientPort | null
  private readonly clock: Clock
  private syncInfo: SyncInfo

  constructor(options: CloudRecordRepositoryOptions = {}) {
    this.cloud = options.cloud !== undefined ? options.cloud : resolveCloudClient()
    this.clock = options.clock ?? new SystemClock()
    this.syncInfo = { state: 'idle', message: '尚未从云端同步' }
  }

  async list(): Promise<LearningRecord[]> {
    return this.listFromCloud('list')
  }

  async get(id: string): Promise<LearningRecord | null> {
    const collection = this.getCollection('get')
    let documents: unknown[]

    try {
      const result = await collection
        .where({ _id: id, _openid: CLOUD_CURRENT_USER_QUERY })
        .limit(1)
        .get()
      documents = result.data
    } catch (error) {
      throw toCloudFailure('get', error)
    }

    // 记录不存在与记录属于其他身份都表现为空结果——调用方无法区分。
    if (documents.length === 0) {
      return null
    }

    return mapCloudDocumentToLearningRecord(documents[0])
  }

  async create(input: RecordInput): Promise<LearningRecord> {
    const collection = this.getCollection('create')
    // 本地生成的 id 只是让记录通过校验的占位符，最终以 CloudBase 的 _id 为准。
    const record = createLearningRecord(input, this.clock, generateRecordId)
    const data = mapLearningRecordToCloudData(record)
    let createdId: string

    try {
      const result = await collection.add({ data })
      createdId = String(result._id)
    } catch (error) {
      throw toCloudFailure('create', error)
    }

    return { ...record, id: createdId, tags: [...record.tags] }
  }

  async update(id: string, input: RecordInput): Promise<LearningRecord> {
    // 先读后写：get 已带 _openid 条件，确认记录存在且属于当前身份。
    const existing = await this.get(id)

    if (existing === null) {
      throw notFound(id)
    }

    const updated = updateLearningRecord(existing, input, this.clock)
    const data = mapLearningRecordToCloudData(updated)
    const collection = this.getCollection('update')
    let updatedCount: number

    try {
      const result = await collection.doc(id).update({ data })
      updatedCount = result.stats.updated
    } catch (error) {
      throw toCloudFailure('update', error)
    }

    // 并发删除等场景下写入可能落空，不能把空写入误报为成功。
    if (updatedCount === 0) {
      throw notFound(id)
    }

    return { ...updated, tags: [...updated.tags] }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.get(id)

    if (existing === null) {
      throw notFound(id)
    }

    const collection = this.getCollection('remove')
    let removedCount: number

    try {
      const result = await collection.doc(id).remove()
      removedCount = result.stats.removed
    } catch (error) {
      throw toCloudFailure('remove', error)
    }

    if (removedCount === 0) {
      throw notFound(id)
    }
  }

  // 批量删除是 P2-08 的交付物：在那之前保持诚实失败，
  // 而不是报告假成功或悄悄返回空数据。
  removeAllMine(): Promise<void> {
    return Promise.reject(
      new Error(
        'CloudRecordRepository.removeAllMine is not supported yet. This is the P2-08 deliverable.',
      ),
    )
  }

  async reloadFromCloud(): Promise<LearningRecord[]> {
    try {
      const records = await this.listFromCloud('reloadFromCloud')

      this.syncInfo = {
        state: 'synced',
        lastSyncedAt: this.clock.now().getTime(),
        message: '已从云端同步',
      }

      return records
    } catch (error) {
      // 失败保留上一次成功同步的时间：同步失败不等于"从来没同步成功过"。
      const previousSyncedAt = this.syncInfo.lastSyncedAt

      this.syncInfo = {
        state: 'failed',
        ...(previousSyncedAt === undefined ? {} : { lastSyncedAt: previousSyncedAt }),
        message: '云端同步失败，请检查网络后重试',
      }

      throw error
    }
  }

  async getSyncInfo(): Promise<SyncInfo> {
    return { ...this.syncInfo }
  }

  private getCollection(method: string): CloudRecordCollection {
    if (this.cloud === null) {
      throw unavailable(method)
    }

    return this.cloud
      .database({ env: CLOUD_ENV_ID })
      .collection(CLOUD_COLLECTIONS.learningRecords)
  }

  private async listFromCloud(method: string): Promise<LearningRecord[]> {
    const collection = this.getCollection(method)
    let documents: unknown[]

    try {
      const result = await collection.where({ _openid: CLOUD_CURRENT_USER_QUERY }).get()
      documents = result.data
    } catch (error) {
      throw toCloudFailure(method, error)
    }

    return sortRecordsNewestFirst(documents.map(mapCloudDocumentToLearningRecord))
  }
}
