import { describe, expect, it } from 'vitest'

import {
  createInitialDraft,
  validateRecordDraft,
  type RecordDraft,
} from '../../miniprogram/features/record-create/index'

describe('createInitialDraft', () => {
  it('creates a draft using the preference defaultDuration (AC-001)', () => {
    const draft = createInitialDraft({ defaultDuration: 45 })

    expect(draft).toEqual({
      content: '',
      duration: 45,
      tags: [],
      takeaway: '',
    })
  })

  it('creates a draft with the minimum allowed duration when preference is 5', () => {
    const draft = createInitialDraft({ defaultDuration: 5 })

    expect(draft.duration).toBe(5)
  })
})

describe('validateRecordDraft', () => {
  const validDraft: RecordDraft = {
    content: '复习 TypeScript 泛型',
    duration: 30,
    tags: ['TypeScript'],
    takeaway: '理解了协变与逆变',
  }

  it('returns valid for a fully correct draft (AC-002)', () => {
    const result = validateRecordDraft(validDraft)

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
    expect(result.value).toEqual(validDraft)
  })

  it('trims leading and trailing whitespace from content (AC-003)', () => {
    const result = validateRecordDraft({
      ...validDraft,
      content: '  写学习笔记  ',
    })

    expect(result.isValid).toBe(true)
    expect(result.value.content).toBe('写学习笔记')
  })

  it('rejects empty content (AC-004)', () => {
    const result = validateRecordDraft({ ...validDraft, content: '' })

    expect(result.isValid).toBe(false)
    expect(result.errors.content).toBeDefined()
  })

  it('rejects whitespace-only content (AC-004)', () => {
    const result = validateRecordDraft({ ...validDraft, content: '   ' })

    expect(result.isValid).toBe(false)
    expect(result.errors.content).toBeDefined()
  })

  const boundaries = [
    { label: 'exactly 1 character', content: 'a', valid: true },
    { label: 'exactly 300 characters', content: 'a'.repeat(300), valid: true },
    { label: '301 characters', content: 'a'.repeat(301), valid: false },
  ] as const

  for (const { label, content, valid } of boundaries) {
    it(`returns ${valid ? 'valid' : 'invalid'} for content with ${label} (AC-005)`, () => {
      const result = validateRecordDraft({ ...validDraft, content })

      expect(result.isValid).toBe(valid)
      if (!valid) {
        expect(result.errors.content).toBeDefined()
      }
    })
  }

  const invalidDurations = [
    { label: '0', duration: 0 },
    { label: '605', duration: 605 },
    { label: '32 (not a multiple of 5)', duration: 32 },
  ] as const

  for (const { label, duration } of invalidDurations) {
    it(`rejects duration ${label} (AC-006)`, () => {
      const result = validateRecordDraft({ ...validDraft, duration })

      expect(result.isValid).toBe(false)
      expect(result.errors.duration).toBeDefined()
    })
  }

  it('accepts duration exactly 5 (AC-006)', () => {
    const result = validateRecordDraft({ ...validDraft, duration: 5 })

    expect(result.isValid).toBe(true)
  })

  it('accepts duration exactly 600 (AC-006)', () => {
    const result = validateRecordDraft({ ...validDraft, duration: 600 })

    expect(result.isValid).toBe(true)
  })

  it('rejects takeaway longer than 140 characters (AC-007)', () => {
    const result = validateRecordDraft({
      ...validDraft,
      takeaway: 'a'.repeat(141),
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.takeaway).toBeDefined()
  })

  it('accepts takeaway with exactly 140 characters and trims it (AC-007)', () => {
    const takeaway = '  ' + 'a'.repeat(140) + '  '

    const result = validateRecordDraft({ ...validDraft, takeaway })

    expect(result.isValid).toBe(true)
    expect(result.value.takeaway).toBe('a'.repeat(140))
  })

  it('returns takeaway as undefined when it is an empty string (AC-008)', () => {
    const result = validateRecordDraft({ ...validDraft, takeaway: '' })

    expect(result.isValid).toBe(true)
    expect(result.value).not.toHaveProperty('takeaway')
  })

  it('returns takeaway as undefined when it is all whitespace (AC-008)', () => {
    const result = validateRecordDraft({ ...validDraft, takeaway: '   ' })

    expect(result.isValid).toBe(true)
    expect(result.value).not.toHaveProperty('takeaway')
  })

  it('reports all field errors at once without short-circuiting (AC-009)', () => {
    const result = validateRecordDraft({
      content: '',
      duration: 7,
      tags: [],
      takeaway: 'a'.repeat(141),
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.content).toBeDefined()
    expect(result.errors.duration).toBeDefined()
    expect(result.errors.takeaway).toBeDefined()
  })

  it('passes tags through unchanged (AC-010)', () => {
    const tags = ['Agent', '微信小程序']

    const result = validateRecordDraft({ ...validDraft, tags })

    expect(result.isValid).toBe(true)
    expect(result.value.tags).toEqual(['Agent', '微信小程序'])
  })

  it('passes through an empty tags array', () => {
    const result = validateRecordDraft({ ...validDraft, tags: [] })

    expect(result.value.tags).toEqual([])
  })
})
