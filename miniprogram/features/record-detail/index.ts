import type { LearningRecord } from '../../domain/learning-record'
import { parseLocalDate } from '../../shared/date/local-date'

export type RecordDetailViewModel = {
  id: string
  dateLabel: string
  weekdayLabel: string
  timeLabel: string
  durationLabel: string
  content: string
  tags: string[]
  takeaway?: string
}

const WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0')

const formatDateLabel = (date: Date): string =>
  `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`

const formatTimeLabel = (createdAt: number): string => {
  const date = new Date(createdAt)
  return `${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`
}

// `record.date` (not `createdAt`) drives the date and weekday shown here; `createdAt`
// is only used to render the creation time of day, per the starter kit's date contract.
export const buildRecordDetail = (record: LearningRecord): RecordDetailViewModel => {
  const localDate = parseLocalDate(record.date)
  const takeaway = record.takeaway?.trim()

  return {
    id: record.id,
    dateLabel: formatDateLabel(localDate),
    weekdayLabel: WEEKDAY_LABELS[localDate.getDay()],
    timeLabel: formatTimeLabel(record.createdAt),
    durationLabel: `${record.duration} 分钟`,
    content: record.content,
    tags: [...record.tags],
    ...(takeaway ? { takeaway } : {}),
  }
}
