import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../miniprogram/domain/learning-record'
import { applyKeywordFilter } from '../../miniprogram/features/log-keyword-filter'
import {
  applyStructuredFilters,
  buildStructuredFilterOptions,
} from '../../miniprogram/features/log-structured-filter'
import { buildLogTimeline } from '../../miniprogram/features/log-timeline'
import { buildMonthCalendar } from '../../miniprogram/features/stats-calendar'
import { buildSevenDayTrend } from '../../miniprogram/features/stats-seven-day-trend'
import { buildTagRank } from '../../miniprogram/features/stats-tag-rank'
import { buildTodayActivity } from '../../miniprogram/features/today-activity'
import { buildTodaySummary } from '../../miniprogram/features/today-summary'
import { FixedClock } from '../../miniprogram/shared/date/clock'

const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))
const record: LearningRecord = {
  id: 'record-1',
  date: '2026-07-15',
  createdAt: 1,
  updatedAt: 1,
  content: '学习微信小程序组件',
  duration: 30,
  tags: ['微信小程序'],
}

describe('starter feature slots', () => {
  it('provides a product-like empty Today and log state', () => {
    const summary = buildTodaySummary([], clock)

    expect(summary).toMatchObject({
      currentStreak: 0,
      todayMinutes: 0,
      todayRecordCount: 0,
      actionText: '记录第一次学习',
    })
    expect(buildLogTimeline([])).toEqual({
      summary: { checkInDays: 0, recordCount: 0, totalMinutes: 0 },
      groups: [],
    })
  })

  it('keeps Phase 2 filters as independent pass-through slots', () => {
    expect(applyStructuredFilters([record], {})).toEqual([record])
    expect(applyKeywordFilter([record], '')).toEqual([record])
    expect(buildStructuredFilterOptions([record], clock)).toEqual({ dates: [], tags: [] })
  })

  it('keeps Phase 2 visual sections hidden until their specs are implemented', () => {
    expect(buildTodayActivity([record], clock)).toEqual({ week: [], todayRecords: [] })
    expect(buildMonthCalendar([record], clock).visible).toBe(false)
    expect(buildSevenDayTrend([record], clock)).toEqual([])
    expect(buildTagRank([record])).toEqual([])
  })
})
