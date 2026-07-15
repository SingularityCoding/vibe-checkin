import type { LearningRecord } from '../../domain/learning-record'
import { parseLocalDate } from '../../shared/date/local-date'

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0')

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

export const buildRecordDetail = (record: LearningRecord): RecordDetailViewModel => {
  const localDate = parseLocalDate(record.date)

  const year = localDate.getFullYear()
  const month = localDate.getMonth() + 1
  const day = localDate.getDate()
  const dateLabel = `${year}年${month}月${day}日`

  const weekdayLabel = WEEKDAY_NAMES[localDate.getDay()]

  const createdAt = new Date(record.createdAt)
  const timeLabel = `${padTwoDigits(createdAt.getHours())}:${padTwoDigits(createdAt.getMinutes())}`

  const durationLabel = `${record.duration} 分钟`

  const tags = [...record.tags]

  const takeaway = record.takeaway?.trim() || undefined

  const model: RecordDetailViewModel = {
    id: record.id,
    dateLabel,
    weekdayLabel,
    timeLabel,
    durationLabel,
    content: record.content,
    tags,
  }

  if (takeaway !== undefined) {
    model.takeaway = takeaway
  }

  return model
}
