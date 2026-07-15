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

export const validateRecordDraft = (draft: RecordDraft): RecordDraftValidation => ({
  isValid: false,
  value: draft,
  errors: {},
})
