import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../../miniprogram/domain/learning-record'
import { buildTagRank } from '../../../miniprogram/features/stats-tag-rank/index'

/**
 * Minimal record factory used across all test cases.
 * Only sets the fields that `buildTagRank` actually reads: tags, createdAt.
 * Optional `duration` is provided where a test needs to rule out duration-based sorting.
 */
const recordWith = (
  tags: string[],
  opts: { createdAt: number; duration?: number },
): LearningRecord => ({
  id: `r-${opts.createdAt}`,
  date: '2026-07-15',
  createdAt: opts.createdAt,
  updatedAt: opts.createdAt + 1000,
  content: '',
  duration: opts.duration ?? 30,
  tags,
})

describe('buildTagRank', () => {
  // AC-001
  it('returns an empty array when there are no records', () => {
    expect(buildTagRank([])).toEqual([])
  })

  // AC-002
  it('counts every tag on a multi-tag record once each', () => {
    const records = [recordWith(['TypeScript', '小程序', 'Code Review'], { createdAt: 100 })]

    const rank = buildTagRank(records)

    expect(rank).toHaveLength(3)
    expect(rank).toEqual(
      expect.arrayContaining([
        { tag: 'TypeScript', count: 1 },
        { tag: '小程序', count: 1 },
        { tag: 'Code Review', count: 1 },
      ]),
    )
  })

  // AC-003
  it('ranks by record count, not by total duration', () => {
    const records = [
      recordWith(['热门'], { createdAt: 10, duration: 5 }),
      recordWith(['热门'], { createdAt: 20, duration: 5 }),
      recordWith(['热门'], { createdAt: 30, duration: 5 }),
      recordWith(['冷门'], { createdAt: 40, duration: 500 }),
    ]

    const rank = buildTagRank(records)

    expect(rank[0]).toEqual({ tag: '热门', count: 3 })
    expect(rank[1]).toEqual({ tag: '冷门', count: 1 })
  })

  // AC-004
  it('breaks ties using the most recent record (max createdAt)', () => {
    const records = [
      recordWith(['旧主题'], { createdAt: 10 }),
      recordWith(['旧主题'], { createdAt: 20 }),
      recordWith(['新主题'], { createdAt: 15 }),
      recordWith(['新主题'], { createdAt: 50 }),
    ]

    const tags = buildTagRank(records).map((item) => item.tag)

    expect(tags).toEqual(['新主题', '旧主题'])
  })

  // AC-005
  it('returns fewer than 3 items when there are only 2 distinct tags', () => {
    const records = [recordWith(['A'], { createdAt: 10 })]

    const rank = buildTagRank(records)

    expect(rank).toHaveLength(1)
    expect(rank[0].tag).toBe('A')
  })

  // AC-006
  it('ignores records without tags', () => {
    const records = [recordWith([], { createdAt: 10 }), recordWith([], { createdAt: 20 })]

    const rank = buildTagRank(records)

    expect(rank).toEqual([])
  })

  // AC-007
  it('returns at most 3 items, with ties broken by lastUsedAt', () => {
    // A, A2, B each appear twice; C, D each appear once. 5 distinct tags total.
    const records = [
      recordWith(['A'], { createdAt: 10 }),
      recordWith(['A'], { createdAt: 20 }),
      recordWith(['A2'], { createdAt: 15 }),
      recordWith(['A2'], { createdAt: 25 }),
      recordWith(['B'], { createdAt: 30 }),
      recordWith(['B'], { createdAt: 50 }), // B's lastUsedAt = 50, the highest
      recordWith(['C'], { createdAt: 40 }),
      recordWith(['D'], { createdAt: 45 }),
    ]

    const rank = buildTagRank(records)

    expect(rank).toHaveLength(3)
    // All have count=2, so order is by lastUsedAt desc: B(50), A2(25), A(20)
    const tags = rank.map((item) => item.tag)
    expect(tags).toEqual(['B', 'A2', 'A'])
  })
})
