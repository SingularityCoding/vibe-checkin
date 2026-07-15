import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'

export type CalendarDay = {
  date: string
  dayOfMonth: number
  hasRecord: boolean
  isCurrentMonth: boolean
}

export type MonthCalendarViewModel = {
  visible: boolean
  monthLabel: string
  days: CalendarDay[]
}

export const buildMonthCalendar = (
  _records: readonly LearningRecord[],
  _clock: Clock,
): MonthCalendarViewModel => ({
  visible: false,
  monthLabel: '',
  days: [],
})
