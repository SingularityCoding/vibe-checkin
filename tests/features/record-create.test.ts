import { describe, expect, it } from 'vitest'

import type { LearningPreference } from '../../miniprogram/domain/learning-preference'
import type { RecordDraft } from '../../miniprogram/features/record-create/index'
import { createInitialDraft, validateRecordDraft } from '../../miniprogram/features/record-create/index'

const preference: LearningPreference = { defaultDuration: 45 }

const validDraft: RecordDraft = {
  content: '梳理 TypeScript 类型和小程序页面之间的数据流',
  duration: 30,
  tags: ['TypeScript', '小程序'],
  takeaway: '先把输入输出类型写清楚。',
}

describe('createInitialDraft', () => {
  it('seeds an empty draft using the preferred default duration', () => {
    expect(createInitialDraft(preference)).toEqual({
      content: '',
      duration: 45,
      tags: [],
      takeaway: '',
    })
  })
})

describe('validateRecordDraft', () => {
  it('accepts a well-formed draft and reports no errors', () => {
    const result = validateRecordDraft(validDraft)

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
    expect(result.value).toEqual(validDraft)
  })

  it('trims surrounding whitespace from content', () => {
    const result = validateRecordDraft({ ...validDraft, content: '  写学习笔记  ' })

    expect(result.isValid).toBe(true)
    expect(result.value.content).toBe('写学习笔记')
  })

  it('rejects empty content and blocks submission', () => {
    const result = validateRecordDraft({ ...validDraft, content: '' })

    expect(result.isValid).toBe(false)
    expect(result.errors.content).toBeDefined()
  })

  it('rejects whitespace-only content', () => {
    const result = validateRecordDraft({ ...validDraft, content: '   ' })

    expect(result.isValid).toBe(false)
    expect(result.errors.content).toBeDefined()
  })

  it('rejects content longer than 300 characters after trimming', () => {
    const result = validateRecordDraft({ ...validDraft, content: 'a'.repeat(301) })

    expect(result.isValid).toBe(false)
    expect(result.errors.content).toBeDefined()
  })

  it('accepts content at exactly the 1 and 300 character boundaries', () => {
    expect(validateRecordDraft({ ...validDraft, content: 'a' }).isValid).toBe(true)
    expect(validateRecordDraft({ ...validDraft, content: 'a'.repeat(300) }).isValid).toBe(true)
  })

  it('rejects duration below 5 minutes', () => {
    const result = validateRecordDraft({ ...validDraft, duration: 0 })

    expect(result.isValid).toBe(false)
    expect(result.errors.duration).toBeDefined()
  })

  it('rejects duration above 600 minutes', () => {
    const result = validateRecordDraft({ ...validDraft, duration: 605 })

    expect(result.isValid).toBe(false)
    expect(result.errors.duration).toBeDefined()
  })

  it('rejects duration that is not a multiple of the 5-minute step', () => {
    const result = validateRecordDraft({ ...validDraft, duration: 32 })

    expect(result.isValid).toBe(false)
    expect(result.errors.duration).toBeDefined()
  })

  it('accepts duration at the 5 and 600 minute boundaries', () => {
    expect(validateRecordDraft({ ...validDraft, duration: 5 }).isValid).toBe(true)
    expect(validateRecordDraft({ ...validDraft, duration: 600 }).isValid).toBe(true)
  })

  it('rejects a takeaway longer than 140 characters after trimming', () => {
    const result = validateRecordDraft({ ...validDraft, takeaway: `  ${'a'.repeat(141)}  ` })

    expect(result.isValid).toBe(false)
    expect(result.errors.takeaway).toBeDefined()
  })

  it('accepts a takeaway at exactly 140 characters', () => {
    const result = validateRecordDraft({ ...validDraft, takeaway: 'a'.repeat(140) })

    expect(result.isValid).toBe(true)
    expect(result.value.takeaway).toBe('a'.repeat(140))
  })

  it('does not persist an empty takeaway', () => {
    const result = validateRecordDraft({ ...validDraft, takeaway: '' })

    expect(result.isValid).toBe(true)
    expect(result.value.takeaway).toBeUndefined()
  })

  it('does not persist a whitespace-only takeaway', () => {
    const result = validateRecordDraft({ ...validDraft, takeaway: '   ' })

    expect(result.isValid).toBe(true)
    expect(result.value.takeaway).toBeUndefined()
  })

  it('trims a non-empty takeaway before persisting it', () => {
    const result = validateRecordDraft({ ...validDraft, takeaway: '  继续巩固  ' })

    expect(result.isValid).toBe(true)
    expect(result.value.takeaway).toBe('继续巩固')
  })

  it('reports multiple field errors at once without short-circuiting', () => {
    const result = validateRecordDraft({
      ...validDraft,
      content: '',
      duration: 7,
      takeaway: 'a'.repeat(141),
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.content).toBeDefined()
    expect(result.errors.duration).toBeDefined()
    expect(result.errors.takeaway).toBeDefined()
  })

  it('passes tags through unchanged, deferring tag validation to the tag-picker feature', () => {
    const result = validateRecordDraft({ ...validDraft, tags: ['Agent'] })

    expect(result.value.tags).toEqual(['Agent'])
  })
})
