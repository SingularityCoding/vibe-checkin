import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'
import { addLocalDays, parseLocalDate } from '../../shared/date/local-date'

export type SevenDayTrendItem = {
  date: string
  label: string
  minutes: number
  isToday: boolean
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

export const buildSevenDayTrend = (
  records: readonly LearningRecord[],
  clock: Clock,
): SevenDayTrendItem[] => {
  const today = clock.today()
  const windowDates: string[] = []
  for (let i = -6; i <= 0; i++) {
    windowDates.push(addLocalDays(today, i))
  }

  const minutesByDate = new Map<string, number>()
  for (const record of records) {
    const prev = minutesByDate.get(record.date) ?? 0
    minutesByDate.set(record.date, prev + record.duration)
  }

  return windowDates.map((date) => {
    const minutes = minutesByDate.get(date) ?? 0
    const isToday = date === today
    const label = isToday ? '今天' : WEEKDAY_LABELS[parseLocalDate(date).getDay()]
    return { date, label, minutes, isToday }
  })
}
