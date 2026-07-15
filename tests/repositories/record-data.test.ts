import { describe, expect, it } from 'vitest'

import type { LearningRecord, RecordInput } from '../../miniprogram/domain/learning-record'
import { assertValidRecordInput, isLearningRecord } from '../../miniprogram/repositories/record-data'

const validInput: RecordInput = {
  content: '实现本地 Repository',
  duration: 30,
  tags: ['TypeScript', 'TDD'],
  takeaway: '先写失败用例能更快发现接口边界。',
}

const validRecord: LearningRecord = {
  id: 'record-1',
  date: '2026-07-15',
  createdAt: new Date(2026, 6, 15, 9, 0).getTime(),
  updatedAt: new Date(2026, 6, 15, 9, 5).getTime(),
  ...validInput,
}

describe('assertValidRecordInput', () => {
  it('accepts a well-formed input', () => {
    expect(() => assertValidRecordInput(validInput)).not.toThrow()
  })

  it('rejects empty or whitespace-only content', () => {
    expect(() => assertValidRecordInput({ ...validInput, content: '   ' })).toThrow(
      'content must be 1-300',
    )
  })

  it('rejects content longer than 300 characters after trimming', () => {
    expect(() =>
      assertValidRecordInput({ ...validInput, content: 'a'.repeat(301) }),
    ).toThrow('content must be 1-300')
  })

  it('accepts content at exactly 300 characters', () => {
    expect(() =>
      assertValidRecordInput({ ...validInput, content: 'a'.repeat(300) }),
    ).not.toThrow()
  })

  it('rejects duration below 5 minutes', () => {
    expect(() => assertValidRecordInput({ ...validInput, duration: 0 })).toThrow(
      'duration must be 5-600',
    )
  })

  it('rejects duration above 600 minutes', () => {
    expect(() => assertValidRecordInput({ ...validInput, duration: 601 })).toThrow(
      'duration must be 5-600',
    )
  })

  it('rejects duration that is not a multiple of 5', () => {
    expect(() => assertValidRecordInput({ ...validInput, duration: 32 })).toThrow(
      'duration must be 5-600',
    )
  })

  it('accepts duration at the 5 and 600 boundaries', () => {
    expect(() => assertValidRecordInput({ ...validInput, duration: 5 })).not.toThrow()
    expect(() => assertValidRecordInput({ ...validInput, duration: 600 })).not.toThrow()
  })

  it('rejects more than 3 tags', () => {
    expect(() =>
      assertValidRecordInput({ ...validInput, tags: ['a', 'b', 'c', 'd'] }),
    ).toThrow('at most 3 entries')
  })

  it('rejects a tag longer than 12 characters after trimming', () => {
    expect(() => assertValidRecordInput({ ...validInput, tags: ['a'.repeat(13)] })).toThrow(
      'tags must be 1-12',
    )
  })

  it('rejects a blank tag', () => {
    expect(() => assertValidRecordInput({ ...validInput, tags: ['   '] })).toThrow(
      'tags must be 1-12',
    )
  })

  it('rejects duplicate tags after trimming', () => {
    expect(() =>
      assertValidRecordInput({ ...validInput, tags: ['Agent', ' Agent '] }),
    ).toThrow('must not contain duplicates')
  })

  it('rejects a takeaway longer than 140 characters after trimming', () => {
    expect(() =>
      assertValidRecordInput({ ...validInput, takeaway: 'a'.repeat(141) }),
    ).toThrow('takeaway must be at most 140')
  })

  it('accepts a missing takeaway', () => {
    const { takeaway: _takeaway, ...withoutTakeaway } = validInput
    expect(() => assertValidRecordInput(withoutTakeaway)).not.toThrow()
  })
})

describe('isLearningRecord', () => {
  it('accepts a well-formed record', () => {
    expect(isLearningRecord(validRecord)).toBe(true)
  })

  it('rejects a record with a duration outside the 5-600 range', () => {
    expect(isLearningRecord({ ...validRecord, duration: 601 })).toBe(false)
  })

  it('rejects a record with a duration that is not a multiple of 5', () => {
    expect(isLearningRecord({ ...validRecord, duration: 31 })).toBe(false)
  })

  it('rejects a record with more than 3 tags', () => {
    expect(isLearningRecord({ ...validRecord, tags: ['a', 'b', 'c', 'd'] })).toBe(false)
  })

  it('rejects a record with a takeaway longer than 140 characters', () => {
    expect(isLearningRecord({ ...validRecord, takeaway: 'a'.repeat(141) })).toBe(false)
  })
})
