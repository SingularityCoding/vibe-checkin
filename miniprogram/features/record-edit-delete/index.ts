import type { RecordDraft } from '../record-create/index'

export const hasRecordDraftChanged = (
  _initialDraft: RecordDraft,
  _currentDraft: RecordDraft,
): boolean => false
