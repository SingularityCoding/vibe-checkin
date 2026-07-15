import { describe, expect, it } from 'vitest'

import { isFixtureReady } from '../../miniprogram/fixtures/ready'

describe('isFixtureReady', () => {
  it('resolves true once the app fixtureReady promise resolves', async () => {
    await expect(isFixtureReady({ fixtureReady: Promise.resolve() })).resolves.toBe(true)
  })

  it('resolves false when the app fixtureReady promise rejects', async () => {
    await expect(
      isFixtureReady({ fixtureReady: Promise.reject(new Error('seed failed')) }),
    ).resolves.toBe(false)
  })
})
