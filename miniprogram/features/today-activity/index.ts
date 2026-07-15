import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'

export type WeekActivityItem = {
  date: string
  weekday: string
  dayOfMonth: number
  isToday: boolean
  hasRecord: boolean
}

export type TodayRecordItem = {
  id: string
  time: string
  duration: number
  content: string
  tags: string[]
}

export type TodayActivityViewModel = {
  week: WeekActivityItem[]
  todayRecords: TodayRecordItem[]
}

export const buildTodayActivity = (
  _records: readonly LearningRecord[],
  _clock: Clock,
): TodayActivityViewModel => ({
  week: [],
  todayRecords: [],
})
