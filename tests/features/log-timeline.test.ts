import { describe, expect, it } from 'vitest'
import { buildLogTimeline } from '../../miniprogram/features/log-timeline/index'
import type { LearningRecord } from '../../miniprogram/domain/learning-record'

const timestamp = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number => new Date(year, month - 1, day, hour, minute).getTime()

const record = (overrides: Partial<LearningRecord> = {}): LearningRecord => ({
  id: 'r1',
  date: '2026-07-15',
  createdAt: timestamp(2026, 7, 15, 9, 0),
  updatedAt: timestamp(2026, 7, 15, 9, 0),
  content: '测试内容',
  duration: 30,
  tags: [],
  ...overrides,
})

describe('buildLogTimeline', () => {
  // AC-001: Empty input
  it('returns safe default for empty records', () => {
    const result = buildLogTimeline([])

    expect(result).toEqual({
      summary: { checkInDays: 0, recordCount: 0, totalMinutes: 0 },
      groups: [],
    })
  })

  // AC-002: Groups sorted by date descending
  it('sorts groups by date descending', () => {
    const records: LearningRecord[] = [
      record({ id: 'a', date: '2026-07-10' }),
      record({ id: 'b', date: '2026-07-15' }),
      record({ id: 'c', date: '2026-07-12' }),
    ]

    const result = buildLogTimeline(records)

    expect(result.groups.map((g) => g.date)).toEqual([
      '2026-07-15',
      '2026-07-12',
      '2026-07-10',
    ])
  })

  // AC-003: Within same date, records sorted by createdAt descending
  it('sorts records within a group by createdAt descending', () => {
    const records: LearningRecord[] = [
      record({
        id: 'morning',
        date: '2026-07-15',
        createdAt: timestamp(2026, 7, 15, 8, 40),
        content: '早上学习',
      }),
      record({
        id: 'afternoon',
        date: '2026-07-15',
        createdAt: timestamp(2026, 7, 15, 15, 5),
        content: '下午学习',
      }),
    ]

    const result = buildLogTimeline(records)

    expect(result.groups).toHaveLength(1)
    const group = result.groups[0]
    expect(group.records.map((r) => r.id)).toEqual(['afternoon', 'morning'])
    expect(group.records[0].time).toBe('15:05')
    expect(group.records[1].time).toBe('08:40')
  })

  // AC-004: Group totalMinutes are independent
  it('calculates totalMinutes per group without cross-contamination', () => {
    const records: LearningRecord[] = [
      record({ id: 'a1', date: '2026-07-15', duration: 40 }),
      record({ id: 'a2', date: '2026-07-15', duration: 20 }),
      record({ id: 'b1', date: '2026-07-14', duration: 50 }),
    ]

    const result = buildLogTimeline(records)

    const groupToday = result.groups.find((g) => g.date === '2026-07-15')!
    const groupYesterday = result.groups.find((g) => g.date === '2026-07-14')!

    expect(groupToday.totalMinutes).toBe(60)
    expect(groupYesterday.totalMinutes).toBe(50)
  })

  // AC-005: Summary is correctly aggregated
  it('aggregates summary correctly across groups', () => {
    const records: LearningRecord[] = [
      record({ id: 'a1', date: '2026-07-15', duration: 40 }),
      record({ id: 'a2', date: '2026-07-15', duration: 20 }),
      record({ id: 'b1', date: '2026-07-14', duration: 50 }),
      record({ id: 'c1', date: '2026-07-13', duration: 60 }),
    ]

    const result = buildLogTimeline(records)

    expect(result.summary).toEqual({
      checkInDays: 3,
      recordCount: 4,
      totalMinutes: 170,
    })
  })

  // AC-006: Records grouped by date field, not derived from createdAt
  it('groups by date field even when createdAt crosses midnight', () => {
    const records: LearningRecord[] = [
      record({
        id: 'late-night',
        date: '2026-07-14',
        createdAt: timestamp(2026, 7, 15, 0, 30),
        content: '深夜复盘',
        duration: 25,
      }),
    ]

    const result = buildLogTimeline(records)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].date).toBe('2026-07-14')
  })

  // AC-007: Record fields are correctly mapped
  it('maps record fields to LogTimelineRecord correctly', () => {
    const records: LearningRecord[] = [
      record({
        id: 'detail-1',
        date: '2026-07-15',
        createdAt: timestamp(2026, 7, 15, 9, 0),
        content: '给学习助手补完了工具调用的边界',
        duration: 45,
        tags: ['Agent', 'MCP'],
      }),
    ]

    const result = buildLogTimeline(records)

    expect(result.groups[0].records[0]).toEqual({
      id: 'detail-1',
      time: '09:00',
      duration: 45,
      content: '给学习助手补完了工具调用的边界',
      tags: ['Agent', 'MCP'],
    })
  })

  // AC-008: dateLabel includes weekday
  it('formats dateLabel with correct weekday', () => {
    const records: LearningRecord[] = [
      record({
        id: 'wed',
        date: '2026-07-15',
      }),
    ]

    const result = buildLogTimeline(records)

    // 2026-07-15 is a Wednesday (周三)
    expect(result.groups[0].dateLabel).toBe('7 月 15 日 · 周三')
  })

  // Verify tags are copied (not shared reference)
  it('copies tags to avoid shared references', () => {
    const mutableTags = ['TDD', 'TypeScript']
    const records: LearningRecord[] = [
      record({
        id: 'tags-test',
        date: '2026-07-15',
        tags: mutableTags,
      }),
    ]

    const result = buildLogTimeline(records)

    // Tags are equal but not the same reference
    expect(result.groups[0].records[0].tags).toEqual(mutableTags)
    expect(result.groups[0].records[0].tags).not.toBe(mutableTags)
  })
})
