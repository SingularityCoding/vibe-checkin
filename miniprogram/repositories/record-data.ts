import {
  RECORD_CONTENT_MAX_LENGTH,
  RECORD_DURATION_MAX,
  RECORD_DURATION_MIN,
  RECORD_DURATION_STEP,
  RECORD_TAG_MAX_COUNT,
  RECORD_TAG_MAX_LENGTH,
  RECORD_TAKEAWAY_MAX_LENGTH,
} from '../domain/constraints'
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
  if (typeof input.content !== 'string') {
    throw new Error('Learning record content must be a string')
  }

  const content = input.content.trim()

  if (content.length === 0 || content.length > RECORD_CONTENT_MAX_LENGTH) {
    throw new Error(
      `Learning record content must be 1-${RECORD_CONTENT_MAX_LENGTH} characters after trimming`,
    )
  }

  if (
    !Number.isFinite(input.duration) ||
    input.duration < RECORD_DURATION_MIN ||
    input.duration > RECORD_DURATION_MAX ||
    input.duration % RECORD_DURATION_STEP !== 0
  ) {
    throw new Error(
      `Learning record duration must be ${RECORD_DURATION_MIN}-${RECORD_DURATION_MAX} in steps of ${RECORD_DURATION_STEP}`,
    )
  }

  if (!Array.isArray(input.tags) || input.tags.length > RECORD_TAG_MAX_COUNT) {
    throw new Error(`Learning record tags must have at most ${RECORD_TAG_MAX_COUNT} entries`)
  }

  const trimmedTags = input.tags.map((tag) => (typeof tag === 'string' ? tag.trim() : ''))

  if (trimmedTags.some((tag) => tag.length === 0 || tag.length > RECORD_TAG_MAX_LENGTH)) {
    throw new Error(
      `Learning record tags must be 1-${RECORD_TAG_MAX_LENGTH} characters after trimming`,
    )
  }

  if (new Set(trimmedTags).size !== trimmedTags.length) {
    throw new Error('Learning record tags must not contain duplicates')
  }

  if (input.takeaway !== undefined) {
    if (
      typeof input.takeaway !== 'string' ||
      input.takeaway.trim().length > RECORD_TAKEAWAY_MAX_LENGTH
    ) {
      throw new Error(
        `Learning record takeaway must be at most ${RECORD_TAKEAWAY_MAX_LENGTH} characters after trimming`,
      )
    }
  }
}

export const isLearningRecord = (value: unknown): value is LearningRecord => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<LearningRecord>

  const content = typeof candidate.content === 'string' ? candidate.content.trim() : ''
  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    : null
  const takeaway =
    candidate.takeaway === undefined
      ? undefined
      : typeof candidate.takeaway === 'string'
        ? candidate.takeaway.trim()
        : null

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.date === 'string' &&
    isLocalDate(candidate.date) &&
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt) &&
    typeof candidate.updatedAt === 'number' &&
    Number.isFinite(candidate.updatedAt) &&
    content.length > 0 &&
    content.length <= RECORD_CONTENT_MAX_LENGTH &&
    typeof candidate.duration === 'number' &&
    Number.isFinite(candidate.duration) &&
    candidate.duration >= RECORD_DURATION_MIN &&
    candidate.duration <= RECORD_DURATION_MAX &&
    candidate.duration % RECORD_DURATION_STEP === 0 &&
    tags !== null &&
    tags.length <= RECORD_TAG_MAX_COUNT &&
    tags.every((tag) => tag.length > 0 && tag.length <= RECORD_TAG_MAX_LENGTH) &&
    new Set(tags).size === tags.length &&
    takeaway !== null &&
    (takeaway === undefined || takeaway.length <= RECORD_TAKEAWAY_MAX_LENGTH)
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
