import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../miniprogram/domain/learning-record'
import { buildTodaySummary } from '../../miniprogram/features/today-summary/index'
import { FixedClock } from '../../miniprogram/shared/date/clock'
import { calculateStreakSummary } from '../../miniprogram/shared/date/streak'

const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))

const recordOn = (
  id: string,
  date: string,
  duration: number,
  createdAt = new Date(`${date}T09:00:00`).getTime(),
): LearningRecord => ({
  id,
  date,
  createdAt,
  updatedAt: createdAt,
  content: `学习记录 ${id}`,
  duration,
  tags: [],
})

describe('buildTodaySummary', () => {
  it('aggregates one record from today', () => {
    const summary = buildTodaySummary([recordOn('today', '2026-07-15', 35)], clock)

    expect(summary.todayMinutes).toBe(35)
    expect(summary.todayRecordCount).toBe(1)
  })

  it('aggregates multiple records from today', () => {
    const summary = buildTodaySummary(
      [
        recordOn('morning', '2026-07-15', 35),
        recordOn('afternoon', '2026-07-15', 25),
        recordOn('night', '2026-07-15', 10),
      ],
      clock,
    )

    expect(summary.todayMinutes).toBe(70)
    expect(summary.todayRecordCount).toBe(3)
  })

  it('excludes records from other dates from today totals', () => {
    const summary = buildTodaySummary(
      [
        recordOn('today', '2026-07-15', 35),
        recordOn('yesterday', '2026-07-14', 45),
        recordOn('older', '2026-07-10', 60),
      ],
      clock,
    )

    expect(summary.todayMinutes).toBe(35)
    expect(summary.todayRecordCount).toBe(1)
  })

  it('uses the shared streak summary when today has records', () => {
    const records = [
      recordOn('today', '2026-07-15', 35),
      recordOn('yesterday', '2026-07-14', 45),
      recordOn('two-days-ago', '2026-07-13', 30),
    ]

    expect(buildTodaySummary(records, clock).currentStreak).toBe(
      calculateStreakSummary(records, clock).current,
    )
  })

  it('uses the shared streak summary when today is empty but yesterday has records', () => {
    const records = [
      recordOn('yesterday', '2026-07-14', 45),
      recordOn('two-days-ago', '2026-07-13', 30),
    ]

    expect(buildTodaySummary(records, clock).currentStreak).toBe(
      calculateStreakSummary(records, clock).current,
    )
    expect(buildTodaySummary(records, clock).currentStreak).toBe(2)
  })

  it('returns a broken current streak when today and yesterday are empty', () => {
    const records = [
      recordOn('two-days-ago', '2026-07-13', 30),
      recordOn('three-days-ago', '2026-07-12', 25),
      recordOn('four-days-ago', '2026-07-11', 20),
    ]

    const summary = buildTodaySummary(records, clock)

    expect(summary.currentStreak).toBe(calculateStreakSummary(records, clock).current)
    expect(summary.currentStreak).toBe(0)
  })

  it('returns first-time action copy for empty history', () => {
    expect(buildTodaySummary([], clock)).toMatchObject({
      currentStreak: 0,
      todayMinutes: 0,
      todayRecordCount: 0,
      actionState: 'first-time',
      actionTitle: '今天还没有开始学习',
      actionText: '记录第一次学习',
    })
  })

  it('returns resume action copy when history exists but today is empty', () => {
    expect(buildTodaySummary([recordOn('yesterday', '2026-07-14', 45)], clock)).toMatchObject({
      todayMinutes: 0,
      todayRecordCount: 0,
      actionState: 'resume',
      actionText: '记录一次学习',
    })
  })

  it('returns recorded-today action copy when today has records', () => {
    expect(buildTodaySummary([recordOn('today', '2026-07-15', 45)], clock)).toMatchObject({
      todayMinutes: 45,
      todayRecordCount: 1,
      actionState: 'recorded-today',
      actionTitle: '今天已经开始学习了',
      actionDescription: '已记录 1 次，继续留下下一段学习轨迹。',
      actionText: '再记录一次学习',
    })
  })

  it('keeps recorded-today action for multiple records today', () => {
    const summary = buildTodaySummary(
      [recordOn('morning', '2026-07-15', 45), recordOn('night', '2026-07-15', 15)],
      clock,
    )

    expect(summary.actionState).toBe('recorded-today')
    expect(summary.actionDescription).toContain('2')
  })

  it('does not depend on input order', () => {
    const records = [
      recordOn('today', '2026-07-15', 35),
      recordOn('older', '2026-07-10', 60),
      recordOn('yesterday', '2026-07-14', 45),
    ]
    const reversed = [...records].reverse()

    expect(buildTodaySummary(records, clock)).toEqual(buildTodaySummary(reversed, clock))
  })

  it('does not mutate the input records', () => {
    const records = [
      recordOn('today', '2026-07-15', 35),
      recordOn('yesterday', '2026-07-14', 45),
    ]
    const snapshot = structuredClone(records)

    buildTodaySummary(records, clock)

    expect(records).toEqual(snapshot)
  })
})
