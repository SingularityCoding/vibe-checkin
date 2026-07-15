import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../../miniprogram/domain/learning-record'
import { buildStatisticsOverview } from '../../../miniprogram/features/statistics-overview/index'
import { FixedClock } from '../../../miniprogram/shared/date/clock'

const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))

let sequence = 0

const recordOn = (date: string, duration: number): LearningRecord => {
  sequence += 1

  return {
    id: `record-${sequence}`,
    date,
    createdAt: sequence,
    updatedAt: sequence,
    content: `learning session ${sequence}`,
    duration,
    tags: [],
  }
}

describe('buildStatisticsOverview', () => {
  it('returns the empty overview when there are no records', () => {
    expect(buildStatisticsOverview([], clock)).toEqual({
      hasRecords: false,
      currentStreak: 0,
      longestStreak: 0,
      checkInDays: 0,
      totalMinutes: 0,
    })
  })

  it('counts multiple same-day records as a single check-in day while still summing their minutes', () => {
    const records = [
      recordOn('2026-07-15', 30),
      recordOn('2026-07-15', 20),
      recordOn('2026-07-14', 25),
    ]

    const overview = buildStatisticsOverview(records, clock)

    expect(overview.hasRecords).toBe(true)
    expect(overview.checkInDays).toBe(2)
    expect(overview.totalMinutes).toBe(75)
    expect(overview.currentStreak).toBe(2)
    expect(overview.longestStreak).toBe(2)
  })

  it('keeps the current streak counting from yesterday when today has no records', () => {
    const records = [
      recordOn('2026-07-14', 40),
      recordOn('2026-07-13', 35),
      recordOn('2026-07-10', 15),
    ]

    const overview = buildStatisticsOverview(records, clock)

    expect(overview.currentStreak).toBe(2)
    expect(overview.longestStreak).toBe(2)
    expect(overview.checkInDays).toBe(3)
    expect(overview.totalMinutes).toBe(90)
  })

  it('calculates the longest streak across a month boundary even when the current streak is broken', () => {
    const records = [
      recordOn('2026-06-29', 30),
      recordOn('2026-06-30', 30),
      recordOn('2026-07-01', 30),
      recordOn('2026-07-05', 20),
    ]

    const overview = buildStatisticsOverview(records, clock)

    expect(overview.longestStreak).toBe(3)
    expect(overview.currentStreak).toBe(0)
    expect(overview.checkInDays).toBe(4)
    expect(overview.totalMinutes).toBe(110)
  })
})
