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

export type InMemoryRecordRepositoryOptions = {
  clock?: Clock
  idGenerator?: RecordIdGenerator
  readError?: Error
}

export class InMemoryRecordRepository implements RecordRepository {
  private records: LearningRecord[]
  private readonly clock: Clock
  private readonly idGenerator: RecordIdGenerator
  private readonly readError?: Error

  constructor(
    initialRecords: readonly LearningRecord[] = [],
    options: InMemoryRecordRepositoryOptions = {},
  ) {
    if (!initialRecords.every(isLearningRecord)) {
      throw new Error('Initial records contain an invalid learning record')
    }

    const ids = new Set(initialRecords.map((record) => record.id))

    if (ids.size !== initialRecords.length) {
      throw new Error('Initial records contain duplicate learning record IDs')
    }

    this.records = initialRecords.map(cloneRecord)
    this.clock = options.clock ?? new SystemClock()
    this.idGenerator = options.idGenerator ?? generateRecordId
    this.readError = options.readError
  }

  async list(): Promise<LearningRecord[]> {
    this.throwIfReadFails()
    return sortRecordsNewestFirst(this.records)
  }

  async get(id: string): Promise<LearningRecord | null> {
    this.throwIfReadFails()
    const record = this.records.find((item) => item.id === id)
    return record ? cloneRecord(record) : null
  }

  async create(input: RecordInput): Promise<LearningRecord> {
    const record = createLearningRecord(input, this.clock, this.idGenerator)

    if (this.records.some((item) => item.id === record.id)) {
      throw new Error(`Learning record ID already exists: ${record.id}`)
    }

    this.records = [...this.records, record]
    return cloneRecord(record)
  }

  async update(id: string, input: RecordInput): Promise<LearningRecord> {
    const index = this.records.findIndex((item) => item.id === id)

    if (index === -1) {
      throw new Error(`Learning record not found: ${id}`)
    }

    const updated = updateLearningRecord(this.records[index], input, this.clock)
    const nextRecords = [...this.records]
    nextRecords[index] = updated
    this.records = nextRecords

    return cloneRecord(updated)
  }

  async remove(id: string): Promise<void> {
    const nextRecords = this.records.filter((item) => item.id !== id)

    if (nextRecords.length === this.records.length) {
      throw new Error(`Learning record not found: ${id}`)
    }

    this.records = nextRecords
  }

  async removeAllMine(): Promise<void> {
    this.records = []
  }

  async reloadFromCloud(): Promise<LearningRecord[]> {
    return this.list()
  }

  async getSyncInfo(): Promise<SyncInfo> {
    return {
      state: 'idle',
      message: '当前使用内存测试数据',
    }
  }

  private throwIfReadFails(): void {
    if (this.readError) {
      throw this.readError
    }
  }
}
