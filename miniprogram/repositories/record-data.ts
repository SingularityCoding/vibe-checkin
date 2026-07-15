import type { LearningRecord, RecordInput } from '../domain/learning-record'
import type { Clock } from '../shared/date/clock'
import {
  compareLocalDates,
  formatLocalDate,
  isLocalDate,
} from '../shared/date/local-date'

export type RecordIdGenerator = (now: Date) => string

export const generateRecordId: RecordIdGenerator = (now) =>
  `record-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const cloneRecord = (record: LearningRecord): LearningRecord => ({
  ...record,
  tags: [...record.tags],
})

export const cloneRecords = (records: readonly LearningRecord[]): LearningRecord[] =>
  records.map(cloneRecord)

export const sortRecordsNewestFirst = (
  records: readonly LearningRecord[],
): LearningRecord[] =>
  cloneRecords(records).sort((left, right) => {
    const dateOrder = compareLocalDates(right.date, left.date)

    if (dateOrder !== 0) {
      return dateOrder
    }

    if (left.createdAt !== right.createdAt) {
      return right.createdAt - left.createdAt
    }

    return left.id.localeCompare(right.id)
  })

export const assertValidRecordInput = (input: RecordInput): void => {
  if (typeof input.content !== 'string' || input.content.trim().length === 0) {
    throw new Error('Learning record content must not be empty')
  }

  if (!Number.isFinite(input.duration) || input.duration <= 0) {
    throw new Error('Learning record duration must be a positive number')
  }

  if (
    !Array.isArray(input.tags) ||
    input.tags.some((tag) => typeof tag !== 'string' || tag.trim().length === 0)
  ) {
    throw new Error('Learning record tags must be non-empty strings')
  }

  if (input.takeaway !== undefined && typeof input.takeaway !== 'string') {
    throw new Error('Learning record takeaway must be a string')
  }
}

export const isLearningRecord = (value: unknown): value is LearningRecord => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<LearningRecord>

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.date === 'string' &&
    isLocalDate(candidate.date) &&
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt) &&
    typeof candidate.updatedAt === 'number' &&
    Number.isFinite(candidate.updatedAt) &&
    typeof candidate.content === 'string' &&
    candidate.content.trim().length > 0 &&
    typeof candidate.duration === 'number' &&
    Number.isFinite(candidate.duration) &&
    candidate.duration > 0 &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every(
      (tag) => typeof tag === 'string' && tag.trim().length > 0,
    ) &&
    (candidate.takeaway === undefined || typeof candidate.takeaway === 'string')
  )
}

export const createLearningRecord = (
  input: RecordInput,
  clock: Clock,
  idGenerator: RecordIdGenerator,
): LearningRecord => {
  assertValidRecordInput(input)

  const now = clock.now()

  if (Number.isNaN(now.getTime())) {
    throw new Error('Cannot create a learning record with an invalid clock')
  }

  const id = idGenerator(new Date(now.getTime()))

  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('Record ID generator must return a non-empty string')
  }

  return {
    id,
    date: formatLocalDate(now),
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    content: input.content,
    duration: input.duration,
    tags: [...input.tags],
    ...(input.takeaway === undefined ? {} : { takeaway: input.takeaway }),
  }
}

export const updateLearningRecord = (
  existing: LearningRecord,
  input: RecordInput,
  clock: Clock,
): LearningRecord => {
  assertValidRecordInput(input)

  const now = clock.now()

  if (Number.isNaN(now.getTime())) {
    throw new Error('Cannot update a learning record with an invalid clock')
  }

  return {
    id: existing.id,
    date: existing.date,
    createdAt: existing.createdAt,
    updatedAt: now.getTime(),
    content: input.content,
    duration: input.duration,
    tags: [...input.tags],
    ...(input.takeaway === undefined ? {} : { takeaway: input.takeaway }),
  }
}
