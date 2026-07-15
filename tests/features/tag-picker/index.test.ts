import { describe, expect, it } from 'vitest'
import type { LearningRecord } from '../../../miniprogram/domain/learning-record'
import {
  collectSuggestedTags,
  normalizeSelectedTags,
} from '../../../miniprogram/features/tag-picker'

const createRecord = (
  id: string,
  createdAt: number,
  tags: string[],
): LearningRecord => ({
  id,
  date: `2026-07-${String(id.length).padStart(2, '0')}`,
  createdAt,
  updatedAt: createdAt,
  content: `record-${id}`,
  duration: 20,
  tags,
})

describe('collectSuggestedTags', () => {
  it('sorts records by createdAt descending and deduplicates tags', () => {
    const r1 = createRecord('r1', 1000, ['TypeScript', 'Git'])
    const r2 = createRecord('r2', 2000, ['TypeScript', '小程序'])

    expect(collectSuggestedTags([r1, r2])).toEqual([
      'TypeScript',
      '小程序',
      'Git',
    ])
  })

  it('sorts three records strictly by createdAt descending', () => {
    const r1 = createRecord('r1', 1000, ['Git'])
    const r2 = createRecord('r2', 3000, ['小程序'])
    const r3 = createRecord('r3', 2000, ['TypeScript'])

    expect(collectSuggestedTags([r1, r2, r3])).toEqual([
      '小程序',
      'TypeScript',
      'Git',
    ])
  })

  it('trims tags', () => {
    const record = createRecord('r1', 1000, ['  Git  ', 'TypeScript'])

    expect(collectSuggestedTags([record])).toEqual(['Git', 'TypeScript'])
  })

  it('removes blank and overlength tags', () => {
    const record = createRecord('r1', 1000, ['   ', 'a'.repeat(13), 'Git'])

    expect(collectSuggestedTags([record])).toEqual(['Git'])
  })

  it('returns an empty array for empty records', () => {
    expect(collectSuggestedTags([])).toEqual([])
  })
})

describe('normalizeSelectedTags', () => {
  it('trims tags', () => {
    expect(normalizeSelectedTags(['  Git  ', ' TypeScript'])).toEqual([
      'Git',
      'TypeScript',
    ])
  })

  it('removes blank tags', () => {
    expect(normalizeSelectedTags(['Git', '   ', ''])).toEqual(['Git'])
  })

  it('removes tags longer than 12 characters', () => {
    expect(normalizeSelectedTags(['Git', 'a'.repeat(13)])).toEqual(['Git'])
  })

  it('accepts a tag exactly 12 characters long', () => {
    expect(normalizeSelectedTags(['a'.repeat(12)])).toEqual(['a'.repeat(12)])
  })

  it('deduplicates normalized tags', () => {
    expect(normalizeSelectedTags(['Git', 'Git', ' Git '])).toEqual(['Git'])
  })

  it('keeps only the first three valid tags', () => {
    expect(
      normalizeSelectedTags(['Git', 'TypeScript', '小程序', 'Agent']),
    ).toEqual(['Git', 'TypeScript', '小程序'])
  })

  it('returns an empty array for empty input', () => {
    expect(normalizeSelectedTags([])).toEqual([])
  })
})
