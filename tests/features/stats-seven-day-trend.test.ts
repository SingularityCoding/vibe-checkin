import { describe, expect, it } from 'vitest'
import { buildSevenDayTrend } from '../../miniprogram/features/stats-seven-day-trend/index'
import type { LearningRecord } from '../../miniprogram/domain/learning-record'
import { FixedClock } from '../../miniprogram/shared/date/clock'

const recordOn = (date: string, duration: number): LearningRecord => ({
  id: `r-${date}-${duration}`,
  date,
  createdAt: 0,
  updatedAt: 0,
  content: '',
  duration,
  tags: [],
})

describe('buildSevenDayTrend', () => {
  // AC-001: Empty records → 7 items, all minutes 0
  it('returns 7 items with zero minutes for empty records (AC-001)', () => {
    const clock = new FixedClock(new Date(2026, 6, 15, 9, 0)) // today = '2026-07-15'
    const result = buildSevenDayTrend([], clock)

    expect(result).toHaveLength(7)
    for (const item of result) {
      expect(item.minutes).toBe(0)
    }
  })

  // AC-002: Date sequence and isToday
  it('produces correct date sequence with only last item isToday (AC-002)', () => {
    const clock = new FixedClock(new Date(2026, 6, 15, 9, 0)) // today = '2026-07-15'
    const result = buildSevenDayTrend([], clock)

    expect(result.map(i => i.date)).toEqual([
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
    ])

    // Only the last item (index 6) is today
    expect(result[6].isToday).toBe(true)
    for (let i = 0; i < 6; i++) {
      expect(result[i].isToday).toBe(false)
    }

    // Label for today is '今天'
    expect(result[6].label).toBe('今天')
  })

  // AC-003: Same-day multiple records → minutes summed
  it('sums minutes of multiple records on the same day (AC-003)', () => {
    const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))
    const records: LearningRecord[] = [
      recordOn('2026-07-15', 30),
      recordOn('2026-07-15', 20),
      recordOn('2026-07-15', 15),
    ]
    const result = buildSevenDayTrend(records, clock)

    const todayItem = result.find(i => i.date === '2026-07-15')
    expect(todayItem?.minutes).toBe(65)
  })

  // AC-004: Sparse records → zero-fill for empty days
  it('fills empty dates with zero minutes, never omits them (AC-004)', () => {
    const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))
    const records: LearningRecord[] = [
      recordOn('2026-07-15', 40),
      recordOn('2026-07-11', 25),
    ]
    const result = buildSevenDayTrend(records, clock)

    expect(result).toHaveLength(7)
    expect(result.find(i => i.date === '2026-07-15')?.minutes).toBe(40)
    expect(result.find(i => i.date === '2026-07-11')?.minutes).toBe(25)

    // The other 5 days must exist with 0 minutes
    const zeroDays = result.filter(i => i.minutes === 0)
    expect(zeroDays).toHaveLength(5)
  })

  // AC-005: Records outside the window are ignored
  it('ignores records outside the 7-day window (AC-005)', () => {
    const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))
    const records: LearningRecord[] = [
      recordOn('2026-07-15', 40),
      recordOn('2026-07-01', 999), // 14 days ago, outside window
    ]
    const result = buildSevenDayTrend(records, clock)

    const totalMinutes = result.reduce((sum, item) => sum + item.minutes, 0)
    expect(totalMinutes).toBe(40)
  })

  // AC-006: Cross-month window
  it('handles cross-month window correctly (AC-006)', () => {
    const clock = new FixedClock(new Date(2026, 7, 2, 9, 0)) // today = '2026-08-02'
    const records: LearningRecord[] = [
      recordOn('2026-07-31', 12),
      recordOn('2026-08-02', 8),
    ]
    const result = buildSevenDayTrend(records, clock)

    expect(result.map(i => i.date)).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ])

    expect(result.find(i => i.date === '2026-07-31')?.minutes).toBe(12)
    expect(result.find(i => i.date === '2026-08-02')?.minutes).toBe(8)
    expect(result[6].isToday).toBe(true)
  })

  // AC-007: Cross-year window
  it('handles cross-year window correctly (AC-007)', () => {
    const clock = new FixedClock(new Date(2026, 0, 2, 9, 0)) // today = '2026-01-02'
    const records: LearningRecord[] = [
      recordOn('2025-12-31', 18),
      recordOn('2026-01-02', 22),
    ]
    const result = buildSevenDayTrend(records, clock)

    expect(result.map(i => i.date)).toEqual([
      '2025-12-27',
      '2025-12-28',
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
    ])

    expect(result.find(i => i.date === '2025-12-31')?.minutes).toBe(18)
    expect(result.find(i => i.date === '2026-01-02')?.minutes).toBe(22)
    expect(result[6].isToday).toBe(true)
  })

  // Weekday labels
  it('uses correct weekday labels for non-today dates', () => {
    const clock = new FixedClock(new Date(2026, 6, 15, 9, 0)) // 2026-07-15 is Wednesday
    const result = buildSevenDayTrend([], clock)

    // 07-09 Thu(4) 07-10 Fri(5) 07-11 Sat(6) 07-12 Sun(0) 07-13 Mon(1) 07-14 Tue(2) 07-15 Wed(3)
    // getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const expectedLabels = ['周四', '周五', '周六', '周日', '周一', '周二', '今天']
    expect(result.map(i => i.label)).toEqual(expectedLabels)
  })

  // Returns a new array (no reference leak)
  it('returns a new array each call', () => {
    const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))
    const records: LearningRecord[] = [recordOn('2026-07-15', 40)]

    const r1 = buildSevenDayTrend(records, clock)
    const r2 = buildSevenDayTrend(records, clock)

    expect(r1).not.toBe(r2)
    expect(r1).toEqual(r2)
  })
})
