import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyLaunchFixture,
  createDevFixtureTools,
  resetFixtureData,
  seedFixtureScenario,
} from '../../miniprogram/fixtures/seed'
import type { FixtureScenarioName } from '../../miniprogram/fixtures/scenarios'
import { useLocalRepositories } from '../../miniprogram/repositories/composition'
import { preferenceRepository } from '../../miniprogram/repositories/preference'
import { recordRepository } from '../../miniprogram/repositories/record'
import { FixedClock } from '../../miniprogram/shared/date/clock'

const clock = new FixedClock(new Date(2026, 6, 15, 16, 30))
const storage = new Map<string, unknown>()
const reLaunch = vi.fn()
let envVersion = 'develop'

beforeEach(() => {
  storage.clear()
  reLaunch.mockClear()
  envVersion = 'develop'
  vi.stubGlobal('wx', {
    getAccountInfoSync: () => ({ miniProgram: { envVersion } }),
    getStorageSync: (key: string) => storage.get(key) ?? '',
    setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key),
    reLaunch,
  })
  useLocalRepositories()
})

afterEach(() => {
  useLocalRepositories()
  vi.unstubAllGlobals()
})

describe('fixture seed tools', () => {
  it('applies a shared compile-mode fixture before the page reads data', async () => {
    await applyLaunchFixture('history', clock)

    await expect(recordRepository.list()).resolves.not.toEqual([])

    await applyLaunchFixture('reset', clock)
    await expect(recordRepository.list()).resolves.toEqual([])
  })

  it('ignores fixture launch parameters outside the develop environment', async () => {
    await applyLaunchFixture('today', clock)
    envVersion = 'trial'

    await applyLaunchFixture('reset', clock)

    await expect(recordRepository.list()).resolves.not.toEqual([])
  })

  it('reports an invalid shared compile-mode fixture clearly', async () => {
    await expect(applyLaunchFixture('typo', clock)).rejects.toThrow(
      'Unknown launch fixture scenario: typo',
    )
  })

  it('seeds persisted history and resets records plus preference', async () => {
    await seedFixtureScenario('history', clock)

    await expect(recordRepository.list()).resolves.not.toEqual([])
    await expect(preferenceRepository.get()).resolves.toEqual({ defaultDuration: 30 })

    await preferenceRepository.save({ defaultDuration: 45 })
    await resetFixtureData()

    await expect(recordRepository.list()).resolves.toEqual([])
    await expect(preferenceRepository.get()).resolves.toEqual({ defaultDuration: 30 })
  })

  it('switches the page-facing repository to the read-error scenario', async () => {
    await seedFixtureScenario('read-error', clock)

    await expect(recordRepository.list()).rejects.toThrow('simulated a record read failure')

    await resetFixtureData()
    await expect(recordRepository.list()).resolves.toEqual([])
  })

  it('reports a clear error for a mistyped Console scenario', async () => {
    await expect(
      seedFixtureScenario('typo' as FixtureScenarioName, clock),
    ).rejects.toThrow('Unknown fixture scenario: typo')
  })

  it('reloads Today after a Console seed command', async () => {
    const tools = createDevFixtureTools(clock)

    await tools.seed('today')
    expect(reLaunch).toHaveBeenCalledWith({ url: '/pages/today/index' })
    await expect(recordRepository.list()).resolves.not.toEqual([])
  })
})
