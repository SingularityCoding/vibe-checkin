import {
  RECORD_CONTENT_MAX_LENGTH,
  RECORD_DURATION_MAX,
  RECORD_DURATION_MIN,
  RECORD_DURATION_STEP,
  RECORD_TAKEAWAY_MAX_LENGTH,
} from '../../domain/constraints'
import type { LearningPreference } from '../../domain/learning-preference'
import type { RecordInput } from '../../domain/learning-record'

export type RecordDraft = RecordInput

export type RecordDraftErrors = Partial<Record<keyof RecordDraft, string>>

export type RecordDraftValidation = {
  isValid: boolean
  value: RecordInput
  errors: RecordDraftErrors
}

export const createInitialDraft = (preference: LearningPreference): RecordDraft => ({
  content: '',
  duration: preference.defaultDuration,
  tags: [],
  takeaway: '',
})

/**
 * Validates and normalizes a record draft for submission.
 *
 * - `content` is trimmed and must be 1-300 characters.
 * - `duration` must fall within the 5-600 minute range in steps of 5.
 * - `takeaway` is trimmed; an empty takeaway is normalized away (`undefined`)
 *   so it is never persisted as a blank string.
 * - `tags` are passed through unchanged: tag-level validation belongs to the
 *   tag-picker feature, which already hands back a normalized array.
 */
export const validateRecordDraft = (draft: RecordDraft): RecordDraftValidation => {
  const errors: RecordDraftErrors = {}

  const content = typeof draft.content === 'string' ? draft.content.trim() : ''

  if (content.length === 0) {
    errors.content = '请填写学习内容'
  } else if (content.length > RECORD_CONTENT_MAX_LENGTH) {
    errors.content = `学习内容最多 ${RECORD_CONTENT_MAX_LENGTH} 字`
  }

  const duration = draft.duration

  if (
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration < RECORD_DURATION_MIN ||
    duration > RECORD_DURATION_MAX ||
    duration % RECORD_DURATION_STEP !== 0
  ) {
    errors.duration = `学习时长需为 ${RECORD_DURATION_MIN}-${RECORD_DURATION_MAX} 分钟，且为 ${RECORD_DURATION_STEP} 分钟的倍数`
  }

  const takeaway = typeof draft.takeaway === 'string' ? draft.takeaway.trim() : ''

  if (takeaway.length > RECORD_TAKEAWAY_MAX_LENGTH) {
    errors.takeaway = `今日收获最多 ${RECORD_TAKEAWAY_MAX_LENGTH} 字`
  }

  const tags = Array.isArray(draft.tags) ? draft.tags : []
  const isValid = Object.keys(errors).length === 0

  return {
    isValid,
    value: {
      content,
      duration,
      tags,
      ...(takeaway.length > 0 ? { takeaway } : {}),
    },
    errors,
  }
}
