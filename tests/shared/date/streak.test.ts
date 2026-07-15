import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../../miniprogram/domain/learning-record'
import { FixedClock } from '../../../miniprogram/shared/date/clock'
import { calculateStreakSummary } from '../../../miniprogram/shared/date/streak'

const recordOn = (date: string): Pick<LearningRecord, 'date'> => ({ date })
const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))

describe('calculateStreakSummary', () => {
  it('returns zeroes when there are no records', () => {
    expect(calculateStreakSummary([], clock)).toEqual({ current: 0, longest: 0 })
  })

  it('counts unique check-in days and starts from today when today has records', () => {
    const records = [
      recordOn('2026-07-15'),
      recordOn('2026-07-15'),
      recordOn('2026-07-14'),
      recordOn('2026-07-13'),
    ]

    expect(calculateStreakSummary(records, clock)).toEqual({ current: 3, longest: 3 })
  })

  it('starts the current streak from yesterday when today has no records', () => {
    const records = [recordOn('2026-07-14'), recordOn('2026-07-13'), recordOn('2026-07-10')]

    expect(calculateStreakSummary(records, clock)).toEqual({ current: 2, longest: 2 })
  })

  it('returns a zero current streak when both today and yesterday are empty', () => {
    const records = [recordOn('2026-07-13'), recordOn('2026-07-12'), recordOn('2026-07-11')]

    expect(calculateStreakSummary(records, clock)).toEqual({ current: 0, longest: 3 })
  })

  it('calculates the longest streak across month boundaries', () => {
    const records = [
      recordOn('2026-06-29'),
      recordOn('2026-06-30'),
      recordOn('2026-07-01'),
      recordOn('2026-07-05'),
      recordOn('2026-07-06'),
    ]

    expect(calculateStreakSummary(records, clock)).toEqual({ current: 0, longest: 3 })
  })
})
