import type { LearningRecord } from '../../domain/learning-record'
import { compareLocalDates, parseLocalDate } from '../../shared/date/local-date'

export type LogTimelineSummary = {
  checkInDays: number
  recordCount: number
  totalMinutes: number
}

export type LogTimelineRecord = {
  id: string
  time: string
  duration: number
  content: string
  tags: string[]
}

export type LogTimelineGroup = {
  date: string
  dateLabel: string
  totalMinutes: number
  records: LogTimelineRecord[]
}

export type LogTimelineViewModel = {
  summary: LogTimelineSummary
  groups: LogTimelineGroup[]
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0')

const formatGroupDateLabel = (date: string): string => {
  const parsed = parseLocalDate(date)

  return `${parsed.getMonth() + 1} 月 ${parsed.getDate()} 日 · 周${WEEKDAY_LABELS[parsed.getDay()]}`
}

const formatRecordTime = (createdAt: number): string => {
  const created = new Date(createdAt)

  return `${padTwoDigits(created.getHours())}:${padTwoDigits(created.getMinutes())}`
}

const sumMinutes = (records: readonly LearningRecord[]): number =>
  records.reduce((total, record) => total + record.duration, 0)

const toTimelineRecord = (record: LearningRecord): LogTimelineRecord => ({
  id: record.id,
  time: formatRecordTime(record.createdAt),
  duration: record.duration,
  content: record.content,
  tags: [...record.tags],
})

const groupRecordsByDate = (records: readonly LearningRecord[]): Map<string, LearningRecord[]> => {
  const grouped = new Map<string, LearningRecord[]>()

  for (const record of records) {
    const existing = grouped.get(record.date)

    if (existing) {
      existing.push(record)
    } else {
      grouped.set(record.date, [record])
    }
  }

  return grouped
}

export const buildLogTimeline = (records: readonly LearningRecord[]): LogTimelineViewModel => {
  const groupedByDate = groupRecordsByDate(records)

  const groups: LogTimelineGroup[] = [...groupedByDate.entries()]
    .sort(([leftDate], [rightDate]) => compareLocalDates(rightDate, leftDate))
    .map(([date, dateRecords]) => {
      const sortedRecords = [...dateRecords].sort((left, right) => right.createdAt - left.createdAt)

      return {
        date,
        dateLabel: formatGroupDateLabel(date),
        totalMinutes: sumMinutes(sortedRecords),
        records: sortedRecords.map(toTimelineRecord),
      }
    })

  return {
    summary: {
      checkInDays: groupedByDate.size,
      recordCount: records.length,
      totalMinutes: sumMinutes(records),
    },
    groups,
  }
}
