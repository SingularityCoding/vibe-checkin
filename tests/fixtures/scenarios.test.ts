import { describe, expect, it } from 'vitest'

import {
  buildFixtureScenario,
  FIXTURE_SCENARIO_NAMES,
} from '../../miniprogram/fixtures/scenarios'
import { FixedClock } from '../../miniprogram/shared/date/clock'

const clock = new FixedClock(new Date(2026, 6, 15, 16, 30))

describe('fixture scenarios', () => {
  it('exposes the four documented scenario names', () => {
    expect(FIXTURE_SCENARIO_NAMES).toEqual([
      'empty',
      'today',
      'history',
      'read-error',
    ])
  })

  it('builds an empty scenario with the default preference', () => {
    expect(buildFixtureScenario('empty', clock)).toMatchObject({
      records: [],
      preference: { defaultDuration: 30 },
    })
  })

  it('builds two records for the injected local day', () => {
    const scenario = buildFixtureScenario('today', clock)

    expect(scenario.records).toHaveLength(2)
    expect(scenario.records.every((record) => record.date === '2026-07-15')).toBe(true)
    expect(scenario.records.some((record) => record.takeaway === undefined)).toBe(true)
    expect(new Set(scenario.records.flatMap((record) => record.tags)).size).toBeGreaterThan(1)
  })

  it('builds history with same-day records, gaps, and a previous month', () => {
    const scenario = buildFixtureScenario('history', clock)
    const dates = scenario.records.map((record) => record.date)

    expect(scenario.records).toHaveLength(8)
    expect(dates.filter((date) => date === '2026-07-15')).toHaveLength(2)
    expect(dates).toContain('2026-07-14')
    expect(dates).toContain('2026-07-12')
    expect(dates.some((date) => date.startsWith('2026-06-'))).toBe(true)
  })

  it('marks read-error as a simulated repository failure', () => {
    const scenario = buildFixtureScenario('read-error', clock)

    expect(scenario.records).toEqual([])
    expect(scenario.readError).toBeInstanceOf(Error)
  })
})
