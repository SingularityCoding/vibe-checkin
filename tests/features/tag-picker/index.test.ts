import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../../miniprogram/domain/learning-record'
import { collectSuggestedTags, normalizeSelectedTags } from '../../../miniprogram/features/tag-picker/index'

const record = (
  id: string,
  createdAt: number,
  tags: string[],
): LearningRecord => ({
  id,
  date: '2026-07-15',
  createdAt,
  updatedAt: createdAt,
  content: 'placeholder content',
  duration: 30,
  tags,
})

describe('collectSuggestedTags', () => {
  it('dedupes candidate topics collected across historical records', () => {
    const records = [
      record('r1', 1_000, ['TypeScript', 'Git']),
      record('r2', 2_000, ['TypeScript', '小程序']),
    ]

    const suggestions = collectSuggestedTags(records)

    expect(suggestions).toEqual(['TypeScript', '小程序', 'Git'])
  })

  it('orders suggestions by most recently used record first', () => {
    const records = [
      record('r1', 1_000, ['Git']),
      record('r2', 3_000, ['小程序']),
      record('r3', 2_000, ['TypeScript']),
    ]

    expect(collectSuggestedTags(records)).toEqual(['小程序', 'TypeScript', 'Git'])
  })

  it('trims leading and trailing whitespace from stored tags', () => {
    const records = [record('r1', 1_000, ['  Git  ', 'TypeScript'])]

    expect(collectSuggestedTags(records)).toEqual(['Git', 'TypeScript'])
  })

  it('drops tags that are empty after trimming or exceed 12 characters', () => {
    const records = [
      record('r1', 1_000, ['   ', 'a'.repeat(13), 'Git']),
    ]

    expect(collectSuggestedTags(records)).toEqual(['Git'])
  })

  it('returns an empty list when there are no records', () => {
    expect(collectSuggestedTags([])).toEqual([])
  })
})

describe('normalizeSelectedTags', () => {
  it('trims leading and trailing whitespace from each tag', () => {
    expect(normalizeSelectedTags(['  Git  ', ' TypeScript'])).toEqual(['Git', 'TypeScript'])
  })

  it('rejects a tag that is empty after trimming', () => {
    expect(normalizeSelectedTags(['Git', '   ', ''])).toEqual(['Git'])
  })

  it('rejects a tag that exceeds 12 characters after trimming', () => {
    const tooLong = 'a'.repeat(13)

    expect(normalizeSelectedTags(['Git', tooLong])).toEqual(['Git'])
  })

  it('accepts a tag at the 12 character boundary', () => {
    const boundary = 'a'.repeat(12)

    expect(normalizeSelectedTags([boundary])).toEqual([boundary])
  })

  it('keeps only one occurrence of a duplicate topic', () => {
    expect(normalizeSelectedTags(['Git', 'Git', ' Git '])).toEqual(['Git'])
  })

  it('caps the result at 3 topics even when more valid unique tags are given', () => {
    expect(normalizeSelectedTags(['Git', 'TypeScript', '小程序', 'Agent'])).toEqual([
      'Git',
      'TypeScript',
      '小程序',
    ])
  })

  it('returns an empty list when no tags are given', () => {
    expect(normalizeSelectedTags([])).toEqual([])
  })
})
