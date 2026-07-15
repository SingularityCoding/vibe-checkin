import type { LearningRecord, RecordInput } from '../../domain/learning-record'
import type { SyncInfo } from '../../domain/sync-info'
import { SystemClock, type Clock } from '../../shared/date/clock'
import {
  cloneRecord,
  createLearningRecord,
  generateRecordId,
  isLearningRecord,
  sortRecordsNewestFirst,
  updateLearningRecord,
  type RecordIdGenerator,
} from '../record-data'
import type { RecordRepository } from '../record-repository'
import { WxStorage, type KeyValueStorage } from '../storage'

export const LOCAL_RECORDS_STORAGE_KEY = 'vibe-checkin.records.v1'

type StoredRecords = {
  version: 1
  records: LearningRecord[]
}

export type LocalRecordRepositoryOptions = {
  storage?: KeyValueStorage
  clock?: Clock
  idGenerator?: RecordIdGenerator
  storageKey?: string
}

const isStoredRecords = (value: unknown): value is StoredRecords => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<StoredRecords>

  return (
    candidate.version === 1 &&
    Array.isArray(candidate.records) &&
    candidate.records.every(isLearningRecord)
  )
}

export class LocalRecordRepository implements RecordRepository {
  private readonly storage: KeyValueStorage
  private readonly clock: Clock
  private readonly idGenerator: RecordIdGenerator
  private readonly storageKey: string

  constructor(options: LocalRecordRepositoryOptions = {}) {
    this.storage = options.storage ?? new WxStorage()
    this.clock = options.clock ?? new SystemClock()
    this.idGenerator = options.idGenerator ?? generateRecordId
    this.storageKey = options.storageKey ?? LOCAL_RECORDS_STORAGE_KEY
  }

  async list(): Promise<LearningRecord[]> {
    return sortRecordsNewestFirst(this.readRecords())
  }

  async get(id: string): Promise<LearningRecord | null> {
    const record = this.readRecords().find((item) => item.id === id)
    return record ? cloneRecord(record) : null
  }

  async create(input: RecordInput): Promise<LearningRecord> {
    const records = this.readRecords()
    const record = createLearningRecord(input, this.clock, this.idGenerator)

    if (records.some((item) => item.id === record.id)) {
      throw new Error(`Learning record ID already exists: ${record.id}`)
    }

    this.writeRecords([...records, record])
    return cloneRecord(record)
  }

  async update(id: string, input: RecordInput): Promise<LearningRecord> {
    const records = this.readRecords()
    const index = records.findIndex((item) => item.id === id)

    if (index === -1) {
      throw new Error(`Learning record not found: ${id}`)
    }

    const updated = updateLearningRecord(records[index], input, this.clock)
    const nextRecords = [...records]
    nextRecords[index] = updated
    this.writeRecords(nextRecords)

    return cloneRecord(updated)
  }

  async remove(id: string): Promise<void> {
    const records = this.readRecords()
    const nextRecords = records.filter((item) => item.id !== id)

    if (nextRecords.length === records.length) {
      throw new Error(`Learning record not found: ${id}`)
    }

    this.writeRecords(nextRecords)
  }

  async removeAllMine(): Promise<void> {
    this.writeRecords([])
  }

  async reloadFromCloud(): Promise<LearningRecord[]> {
    return this.list()
  }

  async getSyncInfo(): Promise<SyncInfo> {
    return {
      state: 'idle',
      message: '当前使用本地开发数据',
    }
  }

  async replaceAll(records: readonly LearningRecord[]): Promise<void> {
    if (!records.every(isLearningRecord)) {
      throw new Error('Fixture contains an invalid learning record')
    }

    const ids = new Set(records.map((record) => record.id))

    if (ids.size !== records.length) {
      throw new Error('Fixture contains duplicate learning record IDs')
    }

    this.writeRecords(records)
  }

  async reset(): Promise<void> {
    this.storage.remove(this.storageKey)
  }

  private readRecords(): LearningRecord[] {
    const stored = this.storage.get(this.storageKey)

    if (stored === undefined || stored === null || stored === '') {
      return []
    }

    if (!isStoredRecords(stored)) {
      throw new Error('Local learning records are unreadable or use an unsupported version')
    }

    return stored.records.map(cloneRecord)
  }

  private writeRecords(records: readonly LearningRecord[]): void {
    this.storage.set(this.storageKey, {
      version: 1,
      records: records.map(cloneRecord),
    } satisfies StoredRecords)
  }
}
