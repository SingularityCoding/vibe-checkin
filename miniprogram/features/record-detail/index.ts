import type { LearningRecord } from '../../domain/learning-record'

export type RecordDetailViewModel = {
  id: string
  dateLabel: string
  timeLabel: string
  durationLabel: string
  content: string
  tags: string[]
  takeaway?: string
}

export const buildRecordDetail = (_record: LearningRecord): RecordDetailViewModel | null => null
