import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../miniprogram/domain/learning-record'
import { buildLogTimeline } from '../../miniprogram/features/log-timeline/index'

const timestamp = (year: number, month: number, day: number, hour: number, minute: number): number =>
  new Date(year, month - 1, day, hour, minute).getTime()

const buildRecord = (overrides: Partial<LearningRecord> & Pick<LearningRecord, 'id' | 'date'>): LearningRecord => ({
  createdAt: timestamp(2026, 7, 1, 9, 0),
  updatedAt: timestamp(2026, 7, 1, 9, 0),
  content: '默认学习内容',
  duration: 30,
  tags: [],
  ...overrides,
})

describe('buildLogTimeline', () => {
  it('returns a zeroed summary and no groups for an empty record list', () => {
    const result = buildLogTimeline([])

    expect(result).toEqual({
      summary: { checkInDays: 0, recordCount: 0, totalMinutes: 0 },
      groups: [],
    })
  })

  it('groups records by local date and orders groups by date descending', () => {
    const records = [
      buildRecord({ id: 'a', date: '2026-07-10', createdAt: timestamp(2026, 7, 10, 9, 0) }),
      buildRecord({ id: 'b', date: '2026-07-15', createdAt: timestamp(2026, 7, 15, 9, 0) }),
      buildRecord({ id: 'c', date: '2026-07-12', createdAt: timestamp(2026, 7, 12, 9, 0) }),
    ]

    const result = buildLogTimeline(records)

    expect(result.groups.map((group) => group.date)).toEqual([
      '2026-07-15',
      '2026-07-12',
      '2026-07-10',
    ])
  })

  it('orders same-day records by creation time descending, most recent first', () => {
    const records = [
      buildRecord({
        id: 'morning',
        date: '2026-07-15',
        createdAt: timestamp(2026, 7, 15, 8, 40),
        content: '早上学习',
      }),
      buildRecord({
        id: 'afternoon',
        date: '2026-07-15',
        createdAt: timestamp(2026, 7, 15, 15, 5),
        content: '下午学习',
      }),
    ]

    const result = buildLogTimeline(records)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].records.map((record) => record.id)).toEqual(['afternoon', 'morning'])
    expect(result.groups[0].records[0].time).toBe('15:05')
    expect(result.groups[0].records[1].time).toBe('08:40')
  })

  it('sums each group total minutes from only that day’s records', () => {
    const records = [
      buildRecord({ id: 'a', date: '2026-07-15', createdAt: timestamp(2026, 7, 15, 8, 0), duration: 40 }),
      buildRecord({ id: 'b', date: '2026-07-15', createdAt: timestamp(2026, 7, 15, 15, 0), duration: 20 }),
      buildRecord({ id: 'c', date: '2026-07-14', createdAt: timestamp(2026, 7, 14, 19, 0), duration: 50 }),
    ]

    const result = buildLogTimeline(records)
    const july15 = result.groups.find((group) => group.date === '2026-07-15')
    const july14 = result.groups.find((group) => group.date === '2026-07-14')

    expect(july15?.totalMinutes).toBe(60)
    expect(july14?.totalMinutes).toBe(50)
  })

  it('computes overall record count, cumulative minutes, and deduplicated check-in days', () => {
    const records = [
      buildRecord({ id: 'a', date: '2026-07-15', createdAt: timestamp(2026, 7, 15, 8, 0), duration: 40 }),
      buildRecord({ id: 'b', date: '2026-07-15', createdAt: timestamp(2026, 7, 15, 15, 0), duration: 20 }),
      buildRecord({ id: 'c', date: '2026-07-14', createdAt: timestamp(2026, 7, 14, 19, 0), duration: 50 }),
      buildRecord({ id: 'd', date: '2026-06-01', createdAt: timestamp(2026, 6, 1, 11, 0), duration: 60 }),
    ]

    const result = buildLogTimeline(records)

    expect(result.summary).toEqual({ checkInDays: 3, recordCount: 4, totalMinutes: 170 })
  })

  it('groups records purely off LearningRecord.date, ignoring the local calendar day of createdAt', () => {
    // A record created just after local midnight but explicitly dated for the previous day
    // (e.g. a very late-night entry) must be grouped under its own `date`, not `createdAt`.
    const records = [
      buildRecord({
        id: 'late-night',
        date: '2026-07-14',
        createdAt: timestamp(2026, 7, 15, 0, 30),
        duration: 25,
      }),
    ]

    const result = buildLogTimeline(records)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].date).toBe('2026-07-14')
  })

  it('carries id, duration, content, and tags into each timeline record', () => {
    const records = [
      buildRecord({
        id: 'tagged',
        date: '2026-07-15',
        createdAt: timestamp(2026, 7, 15, 9, 0),
        duration: 45,
        content: '给学习助手补完了工具调用的边界',
        tags: ['Agent', 'MCP'],
      }),
    ]

    const result = buildLogTimeline(records)

    expect(result.groups[0].records[0]).toEqual({
      id: 'tagged',
      time: '09:00',
      duration: 45,
      content: '给学习助手补完了工具调用的边界',
      tags: ['Agent', 'MCP'],
    })
  })

  it('formats the group date label with month, day, and local weekday', () => {
    const records = [buildRecord({ id: 'a', date: '2026-07-15', createdAt: timestamp(2026, 7, 15, 9, 0) })]

    const result = buildLogTimeline(records)

    // 2026-07-15 is a Wednesday.
    expect(result.groups[0].dateLabel).toBe('7 月 15 日 · 周三')
  })
})
