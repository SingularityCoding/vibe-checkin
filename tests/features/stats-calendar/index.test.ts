import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../../miniprogram/domain/learning-record'
import { buildMonthCalendar } from '../../../miniprogram/features/stats-calendar/index'
import { FixedClock } from '../../../miniprogram/shared/date/clock'

let sequence = 0

const recordOn = (date: string): LearningRecord => {
  sequence += 1

  return {
    id: `record-${sequence}`,
    date,
    createdAt: sequence,
    updatedAt: sequence,
    content: `learning session ${sequence}`,
    duration: 30,
    tags: [],
  }
}

const calendarFor = (today: Date, dates: string[]) =>
  buildMonthCalendar(
    dates.map((date) => recordOn(date)),
    new FixedClock(today),
  )

describe('buildMonthCalendar', () => {
  it('returns a hidden empty model without fabricated days or marks', () => {
    const calendar = buildMonthCalendar(
      [],
      new FixedClock(new Date(2026, 6, 15, 9, 0)),
    )

    expect(calendar).toEqual({ visible: false, monthLabel: '', days: [] })
  })

  it('builds the complete current month with the correct weekday offset', () => {
    const calendar = calendarFor(new Date(2026, 6, 15, 9, 0), ['2026-07-02'])
    const currentMonthDays = calendar.days.filter((day) => day.isCurrentMonth)

    expect(calendar.visible).toBe(true)
    expect(calendar.monthLabel).toBe('2026年7月')
    expect(calendar.days).toHaveLength(35)
    expect(calendar.days.slice(0, 3).map((day) => day.date)).toEqual([
      '2026-06-28',
      '2026-06-29',
      '2026-06-30',
    ])
    expect(currentMonthDays).toHaveLength(31)
    expect(currentMonthDays[0]?.dayOfMonth).toBe(1)
    expect(currentMonthDays[currentMonthDays.length - 1]?.dayOfMonth).toBe(31)
    expect(calendar.days.length % 7).toBe(0)
  })

  it.each([
    [2024, 29],
    [2023, 28],
  ])('uses the correct February length for %i', (year, expectedDays) => {
    const calendar = calendarFor(new Date(year, 1, 10, 9, 0), [
      `${year}-02-10`,
    ])

    expect(calendar.days.filter((day) => day.isCurrentMonth)).toHaveLength(
      expectedDays,
    )
  })

  it('marks unique record dates and ignores duplicate records on the same date', () => {
    const calendar = calendarFor(new Date(2026, 6, 15, 9, 0), [
      '2026-07-02',
      '2026-07-02',
      '2026-07-20',
    ])

    expect(
      calendar.days
        .filter((day) => day.isCurrentMonth && day.hasRecord)
        .map((day) => day.dayOfMonth),
    ).toEqual([2, 20])
  })

  it('matches complete dates instead of confusing equal day numbers across months', () => {
    const calendar = calendarFor(new Date(2026, 6, 15, 9, 0), [
      '2026-06-15',
      '2026-08-15',
    ])
    const july15 = calendar.days.find((day) => day.date === '2026-07-15')

    expect(july15?.hasRecord).toBe(false)
    expect(
      calendar.days
        .filter((day) => day.isCurrentMonth)
        .every((day) => day.date.startsWith('2026-07-')),
    ).toBe(true)
  })

  it('marks filler days by their own real dates', () => {
    const calendar = calendarFor(new Date(2026, 6, 15, 9, 0), [
      '2026-06-30',
    ])
    const filler = calendar.days.find((day) => day.date === '2026-06-30')

    expect(filler).toMatchObject({
      date: '2026-06-30',
      dayOfMonth: 30,
      hasRecord: true,
      isCurrentMonth: false,
    })
  })
})
