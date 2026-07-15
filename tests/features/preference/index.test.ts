import { describe, expect, it } from 'vitest'

import { validateDefaultDuration } from '../../../miniprogram/features/preference/index'
import { LocalPreferenceRepository } from '../../../miniprogram/repositories/local-preference/index'
import { LocalRecordRepository } from '../../../miniprogram/repositories/local-record/index'
import { FixedClock } from '../../../miniprogram/shared/date/clock'
import { TestStorage } from '../../repositories/test-storage'

describe('validateDefaultDuration', () => {
  it('accepts the 5 and 600 minute boundaries', () => {
    expect(validateDefaultDuration(5)).toEqual({ isValid: true, value: 5 })
    expect(validateDefaultDuration(600)).toEqual({ isValid: true, value: 600 })
  })

  it('accepts a value inside the range that lands on the 5 minute step', () => {
    expect(validateDefaultDuration(45)).toEqual({ isValid: true, value: 45 })
  })

  it('rejects a value below the 5 minute minimum', () => {
    const result = validateDefaultDuration(0)

    expect(result.isValid).toBe(false)
    expect(result.value).toBe(0)
    expect(result.error).toBeTruthy()
  })

  it('rejects a value above the 600 minute maximum', () => {
    const result = validateDefaultDuration(601)

    expect(result.isValid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects a value that is not a multiple of the 5 minute step', () => {
    const result = validateDefaultDuration(33)

    expect(result.isValid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects a non-integer value', () => {
    const result = validateDefaultDuration(30.5)

    expect(result.isValid).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

describe('changing the default duration preference', () => {
  it('does not retroactively change the duration already saved on existing records', async () => {
    const storage = new TestStorage()
    const clock = new FixedClock(new Date(2026, 6, 15, 9, 0))
    const recordRepository = new LocalRecordRepository({
      storage,
      clock,
      idGenerator: () => 'existing-record',
    })
    const preferenceRepository = new LocalPreferenceRepository({ storage })

    const existing = await recordRepository.create({
      content: '按照当时的默认时长创建的记录',
      duration: 30,
      tags: [],
    })

    const validation = validateDefaultDuration(60)
    expect(validation.isValid).toBe(true)
    await preferenceRepository.save({ defaultDuration: validation.value })

    await expect(recordRepository.get(existing.id)).resolves.toMatchObject({
      duration: 30,
    })
    await expect(preferenceRepository.get()).resolves.toEqual({ defaultDuration: 60 })
  })
})
