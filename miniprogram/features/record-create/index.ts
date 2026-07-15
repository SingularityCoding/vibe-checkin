import type { LearningPreference } from '../../domain/learning-preference'
import type { RecordInput } from '../../domain/learning-record'
import {
  RECORD_CONTENT_MAX_LENGTH,
  RECORD_DURATION_MAX,
  RECORD_DURATION_MIN,
  RECORD_DURATION_STEP,
  RECORD_TAKEAWAY_MAX_LENGTH,
} from '../../domain/constraints'

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

export const validateRecordDraft = (draft: RecordDraft): RecordDraftValidation => {
  const errors: RecordDraftErrors = {}

  const trimmedContent = draft.content.trim()

  if (trimmedContent.length === 0) {
    errors.content = '请填写学习内容'
  } else if (trimmedContent.length > RECORD_CONTENT_MAX_LENGTH) {
    errors.content = `学习内容最多 ${RECORD_CONTENT_MAX_LENGTH} 字`
  }

  const durationValid =
    Number.isFinite(draft.duration) &&
    draft.duration >= RECORD_DURATION_MIN &&
    draft.duration <= RECORD_DURATION_MAX &&
    draft.duration % RECORD_DURATION_STEP === 0

  if (!durationValid) {
    errors.duration = `学习时长需为 ${RECORD_DURATION_MIN}–${RECORD_DURATION_MAX} 分钟且为 ${RECORD_DURATION_STEP} 的倍数`
  }

  const trimmedTakeaway = (draft.takeaway ?? '').trim()

  if (trimmedTakeaway.length > RECORD_TAKEAWAY_MAX_LENGTH) {
    errors.takeaway = `今日收获最多 ${RECORD_TAKEAWAY_MAX_LENGTH} 字`
  }

  const value: RecordInput = {
    content: trimmedContent,
    duration: draft.duration,
    tags: [...draft.tags],
  }

  if (trimmedTakeaway.length > 0) {
    value.takeaway = trimmedTakeaway
  }

  return {
    isValid: Object.keys(errors).length === 0,
    value,
    errors,
  }
}
