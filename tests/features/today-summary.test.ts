import { describe, expect, it } from 'vitest'

import { buildTodaySummary } from '../../miniprogram/features/today-summary/index'
import type { LearningRecord } from '../../miniprogram/domain/learning-record'
import { FixedClock } from '../../miniprogram/shared/date/clock'

const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))

const recordOn = (
  date: string,
  duration: number,
  overrides: Partial<LearningRecord> = {},
): LearningRecord => ({
  id: overrides.id ?? `${date}-${duration}-${Math.random()}`,
  date,
  createdAt: overrides.createdAt ?? Date.parse(`${date}T00:00:00`),
  updatedAt: overrides.updatedAt ?? Date.parse(`${date}T00:00:00`),
  content: overrides.content ?? 'content',
  duration,
  tags: overrides.tags ?? [],
  ...(overrides.takeaway === undefined ? {} : { takeaway: overrides.takeaway }),
})

describe('buildTodaySummary', () => {
  it('reports the first-time-use state and all zeroes when there are no records', () => {
    const model = buildTodaySummary([], clock)

    expect(model).toMatchObject({
      currentStreak: 0,
      todayMinutes: 0,
      todayRecordCount: 0,
      actionState: 'first-time',
      actionText: '记录第一次学习',
    })
    expect(model.actionTitle).toBe('今天还没有开始学习')
  })

  it('aggregates minutes and count from multiple records created today', () => {
    const records = [
      recordOn('2026-07-15', 35),
      recordOn('2026-07-15', 25),
      recordOn('2026-07-15', 10),
      recordOn('2026-07-14', 45),
    ]

    const model = buildTodaySummary(records, clock)

    expect(model.todayRecordCount).toBe(3)
    expect(model.todayMinutes).toBe(70)
  })

  it('reports the resume state and streak from yesterday when today has no records', () => {
    const records = [recordOn('2026-07-14', 40), recordOn('2026-07-13', 30)]

    const model = buildTodaySummary(records, clock)

    expect(model.todayMinutes).toBe(0)
    expect(model.todayRecordCount).toBe(0)
    expect(model.currentStreak).toBe(2)
    expect(model.actionState).toBe('resume')
    expect(model.actionText).toBe('记录一次学习')
  })

  it('reports a zero current streak when there is history but a gap covers today and yesterday', () => {
    const records = [recordOn('2026-07-10', 20), recordOn('2026-07-09', 20)]

    const model = buildTodaySummary(records, clock)

    expect(model.currentStreak).toBe(0)
    expect(model.actionState).toBe('resume')
  })

  it('reports the recorded-today state, includes the count in the description, and counts today toward the streak', () => {
    const records = [
      recordOn('2026-07-15', 45),
      recordOn('2026-07-15', 15),
      recordOn('2026-07-14', 30),
    ]

    const model = buildTodaySummary(records, clock)

    expect(model.todayRecordCount).toBe(2)
    expect(model.todayMinutes).toBe(60)
    expect(model.currentStreak).toBe(2)
    expect(model.actionState).toBe('recorded-today')
    expect(model.actionText).toBe('再记录一次学习')
    expect(model.actionDescription).toContain('2')
  })
})
