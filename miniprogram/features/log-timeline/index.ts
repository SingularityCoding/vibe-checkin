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

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0')

const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp)
  return `${padTwoDigits(d.getHours())}:${padTwoDigits(d.getMinutes())}`
}

const formatDateLabel = (date: string): string => {
  const d = parseLocalDate(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = WEEKDAY_LABELS[d.getDay()]
  return `${month} 月 ${day} 日 · 周${weekday}`
}

const toTimelineRecord = (record: LearningRecord): LogTimelineRecord => ({
  id: record.id,
  time: formatTime(record.createdAt),
  duration: record.duration,
  content: record.content,
  tags: [...record.tags],
})

export const buildLogTimeline = (
  records: readonly LearningRecord[],
): LogTimelineViewModel => {
  if (records.length === 0) {
    return {
      summary: { checkInDays: 0, recordCount: 0, totalMinutes: 0 },
      groups: [],
    }
  }

  // Group records by date
  const groupsByDate = new Map<string, LearningRecord[]>()
  for (const record of records) {
    const group = groupsByDate.get(record.date)
    if (group) {
      group.push(record)
    } else {
      groupsByDate.set(record.date, [record])
    }
  }

  // Sort dates descending
  const dates = [...groupsByDate.keys()].sort((a, b) => compareLocalDates(b, a))

  let totalMinutes = 0

  const groups: LogTimelineGroup[] = dates.map((date) => {
    const dateRecords = groupsByDate.get(date)!
    // Sort within group by createdAt descending
    dateRecords.sort((a, b) => b.createdAt - a.createdAt)

    const groupTotalMinutes = dateRecords.reduce((sum, r) => sum + r.duration, 0)
    totalMinutes += groupTotalMinutes

    return {
      date,
      dateLabel: formatDateLabel(date),
      totalMinutes: groupTotalMinutes,
      records: dateRecords.map(toTimelineRecord),
    }
  })

  return {
    summary: {
      checkInDays: groups.length,
      recordCount: records.length,
      totalMinutes,
    },
    groups,
  }
}
