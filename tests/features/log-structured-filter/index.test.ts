import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../../miniprogram/domain/learning-record'
import {
  applyStructuredFilters,
  buildStructuredFilterOptions,
} from '../../../miniprogram/features/log-structured-filter/index'
import { FixedClock } from '../../../miniprogram/shared/date/clock'

const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))

const record = (
  id: string,
  date: string,
  createdAt: number,
  tags: string[],
): LearningRecord => ({
  id,
  date,
  createdAt,
  updatedAt: createdAt + 300,
  content: `content for ${id}`,
  duration: 30,
  tags,
})

describe('buildStructuredFilterOptions', () => {
  it('returns exactly 7 date options covering a rolling 7-day window, old-to-new, with weekday labels (AC-001)', () => {
    const result = buildStructuredFilterOptions([], clock)

    expect(result.dates).toHaveLength(7)

    const values = result.dates.map((d) => d.value)

    expect(values).toEqual([
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
    ])

    const labels = result.dates.map((d) => d.label)

    expect(labels).toEqual(['四', '五', '六', '日', '一', '二', '今'])
  })

  it('returns empty tags array when there are no records', () => {
    const result = buildStructuredFilterOptions([], clock)

    expect(result.tags).toEqual([])
  })

  it('deduplicates tags and sorts by most recent use (AC-002)', () => {
    const records = [
      record('r1', '2026-07-10', 1_000, ['Git', 'TypeScript']),
      record('r2', '2026-07-12', 3_000, ['小程序']),
      record('r3', '2026-07-11', 2_000, ['TypeScript']),
    ]

    const result = buildStructuredFilterOptions(records, clock)

    expect(result.tags).toEqual(['小程序', 'TypeScript', 'Git'])
  })

  it('trims surrounding whitespace and discards empty/whitespace-only tags (AC-003)', () => {
    const records = [
      record('r1', '2026-07-10', 1_000, ['  Git  ', '   ']),
    ]

    const result = buildStructuredFilterOptions(records, clock)

    expect(result.tags).toEqual(['Git'])
  })
})

describe('applyStructuredFilters', () => {
  const records = [
    record('today-ts', '2026-07-15', 1_000, ['TypeScript', '小程序']),
    record('today-cr', '2026-07-15', 2_000, ['Code Review']),
    record('yesterday-git', '2026-07-14', 3_000, ['Git']),
    record('older-ts', '2026-06-01', 4_000, ['TypeScript']),
  ]

  it('filters by date only, returning records with a matching date (AC-004)', () => {
    const result = applyStructuredFilters(records, { date: '2026-07-15' })

    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(['today-ts', 'today-cr'])
  })

  it('filters by tag only, returning records that include the tag (AC-005)', () => {
    const result = applyStructuredFilters(records, { tag: 'TypeScript' })

    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(['today-ts', 'older-ts'])
  })

  it('applies AND semantics when both date and tag are present (AC-006)', () => {
    const result = applyStructuredFilters(records, {
      date: '2026-07-15',
      tag: 'TypeScript',
    })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('today-ts')
  })

  it('returns an empty array when the AND combination matches nothing (AC-007)', () => {
    const result = applyStructuredFilters(records, {
      date: '2026-07-14',
      tag: 'TypeScript',
    })

    expect(result).toHaveLength(0)
  })

  it('filters correctly by a date outside the rolling 7-day window (AC-008)', () => {
    const result = applyStructuredFilters(records, { date: '2026-06-01' })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('older-ts')
  })

  it('returns all records unchanged for an empty filter value (AC-009)', () => {
    const result = applyStructuredFilters(records, {})

    expect(result).toHaveLength(4)
  })

  it('does not mutate the input array (CON-003)', () => {
    const frozen = Object.freeze([...records])

    expect(() => applyStructuredFilters(frozen, { date: '2026-07-15' })).not.toThrow()
  })
})
