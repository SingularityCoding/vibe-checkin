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
})
