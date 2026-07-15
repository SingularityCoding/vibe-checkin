import { describe, expect, it } from 'vitest'

import { LocalPreferenceRepository } from '../../miniprogram/repositories/local-preference/index'
import { TestStorage } from './test-storage'

describe('LocalPreferenceRepository', () => {
  it('returns 30 minutes when no preference has been saved', async () => {
    const repository = new LocalPreferenceRepository({ storage: new TestStorage() })

    await expect(repository.get()).resolves.toEqual({ defaultDuration: 30 })
  })

  it('persists the default duration for a later repository instance', async () => {
    const storage = new TestStorage()
    const first = new LocalPreferenceRepository({ storage })
    await first.save({ defaultDuration: 45 })

    const reopened = new LocalPreferenceRepository({ storage })
    await expect(reopened.get()).resolves.toEqual({ defaultDuration: 45 })
  })

  it('rejects values that cannot form a valid persisted preference', async () => {
    const repository = new LocalPreferenceRepository({ storage: new TestStorage() })

    await expect(repository.save({ defaultDuration: 0 })).rejects.toThrow(
      'positive integer',
    )
  })

  it('rejects a duration above 600 minutes', async () => {
    const repository = new LocalPreferenceRepository({ storage: new TestStorage() })

    await expect(repository.save({ defaultDuration: 601 })).rejects.toThrow(
      'positive integer',
    )
  })

  it('rejects a duration that is not a multiple of 5', async () => {
    const repository = new LocalPreferenceRepository({ storage: new TestStorage() })

    await expect(repository.save({ defaultDuration: 32 })).rejects.toThrow(
      'positive integer',
    )
  })

  it('accepts the 5 and 600 minute boundaries', async () => {
    const repository = new LocalPreferenceRepository({ storage: new TestStorage() })

    await expect(repository.save({ defaultDuration: 5 })).resolves.toEqual({
      defaultDuration: 5,
    })
    await expect(repository.save({ defaultDuration: 600 })).resolves.toEqual({
      defaultDuration: 600,
    })
  })
})
