import type { LearningRecord } from '../../domain/learning-record'
import { CLOUD_RECORD_SCHEMA_VERSION } from '../../config/cloud'
import { cloneRecord, isLearningRecord } from '../record-data'

export type CloudLearningRecordDocument = {
  _id: string
  _openid: string
  schemaVersion: typeof CLOUD_RECORD_SCHEMA_VERSION
  date: string
  createdAt: number
  updatedAt: number
  content: string
  duration: number
  tags: string[]
  takeaway: string
}

export type CloudLearningRecordWriteData = Omit<
  CloudLearningRecordDocument,
  '_id' | '_openid'
>

export const mapCloudDocumentToLearningRecord = (
  value: unknown,
): LearningRecord => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Cloud learning record document must be an object')
  }

  const document = value as Partial<CloudLearningRecordDocument>

  if (
    document.schemaVersion !== CLOUD_RECORD_SCHEMA_VERSION ||
    typeof document._id !== 'string' ||
    document._id.length === 0 ||
    typeof document._openid !== 'string' ||
    document._openid.length === 0 ||
    typeof document.takeaway !== 'string'
  ) {
    throw new Error('Cloud learning record document has an unsupported shape')
  }

  const record: LearningRecord = {
    id: document._id,
    date: document.date ?? '',
    createdAt: document.createdAt ?? Number.NaN,
    updatedAt: document.updatedAt ?? Number.NaN,
    content: document.content ?? '',
    duration: document.duration ?? Number.NaN,
    tags: Array.isArray(document.tags) ? [...document.tags] : [],
    ...(document.takeaway.length === 0 ? {} : { takeaway: document.takeaway }),
  }

  if (!isLearningRecord(record)) {
    throw new Error('Cloud learning record document contains invalid record data')
  }

  return cloneRecord(record)
}

export const mapLearningRecordToCloudData = (
  record: LearningRecord,
): CloudLearningRecordWriteData => {
  if (!isLearningRecord(record)) {
    throw new Error('Cannot map an invalid learning record to CloudBase')
  }

  return {
    schemaVersion: CLOUD_RECORD_SCHEMA_VERSION,
    date: record.date,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    content: record.content,
    duration: record.duration,
    tags: [...record.tags],
    takeaway: record.takeaway ?? '',
  }
}
