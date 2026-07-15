import { describe, expect, it } from 'vitest'

import { validateDefaultDuration } from '../../../miniprogram/features/preference/index'
import { LocalPreferenceRepository } from '../../../miniprogram/repositories/local-preference/index'
import { LocalRecordRepository } from '../../../miniprogram/repositories/local-record/index'
import { FixedClock } from '../../../miniprogram/shared/date/clock'
import { TestStorage } from '../../repositories/test-storage'

describe('validateDefaultDuration', () => {
  it.each([5, 45, 600])('accepts %i minutes', (value) => {
    expect(validateDefaultDuration(value)).toEqual({ isValid: true, value })
  })

  it.each([0, 601, 33, 30.5])('rejects %s minutes with an error', (value) => {
    expect(validateDefaultDuration(value)).toEqual({
      isValid: false,
      value,
      error: '默认学习时长需为 5–600 分钟，并以 5 分钟为步长。',
    })
  })
})

describe('learning preference persistence', () => {
  it('does not change the duration of an existing record', async () => {
    const storage = new TestStorage()
    const recordRepository = new LocalRecordRepository({
      storage,
      clock: new FixedClock(new Date(2026, 6, 15, 9, 30)),
      idGenerator: () => 'existing-record',
    })
    const preferenceRepository = new LocalPreferenceRepository({ storage })
    const existing = await recordRepository.create({
      content: '按照原默认时长创建的记录',
      duration: 30,
      tags: [],
    })

    const validation = validateDefaultDuration(60)
    expect(validation.isValid).toBe(true)
    await preferenceRepository.save({ defaultDuration: validation.value })

    await expect(recordRepository.get(existing.id)).resolves.toMatchObject({
      duration: 30,
    })
    await expect(preferenceRepository.get()).resolves.toEqual({
      defaultDuration: 60,
    })
  })
})
