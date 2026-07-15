import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'
import { formatLocalDate, parseLocalDate } from '../../shared/date/local-date'

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
  records: readonly LearningRecord[],
  clock: Clock,
): MonthCalendarViewModel => {
  if (records.length === 0) {
    return {
      visible: false,
      monthLabel: '',
      days: [],
    }
  }

  const today = parseLocalDate(clock.today())
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingDayCount = firstOfMonth.getDay()
  const gridDayCount = leadingDayCount + daysInMonth
  const trailingDayCount = (7 - (gridDayCount % 7)) % 7
  const recordDates = new Set(records.map((record) => record.date))
  const days: CalendarDay[] = []

  for (
    let offset = -leadingDayCount;
    offset < daysInMonth + trailingDayCount;
    offset += 1
  ) {
    const date = new Date(year, month, offset + 1)
    const dateText = formatLocalDate(date)

    days.push({
      date: dateText,
      dayOfMonth: date.getDate(),
      hasRecord: recordDates.has(dateText),
      isCurrentMonth: date.getFullYear() === year && date.getMonth() === month,
    })
  }

  return {
    visible: true,
    monthLabel: `${year}年${month + 1}月`,
    days,
  }
}
