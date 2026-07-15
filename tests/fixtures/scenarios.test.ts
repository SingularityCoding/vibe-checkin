import { describe, expect, it } from 'vitest'

import { buildFixtureScenario } from '../../miniprogram/fixtures/scenarios'
import { FixedClock } from '../../miniprogram/shared/date/clock'

const clock = new FixedClock(new Date(2026, 6, 15, 16, 30))

describe('fixture scenarios', () => {
  it('builds an empty scenario with the default preference', () => {
    expect(buildFixtureScenario('empty', clock)).toMatchObject({
      records: [],
      preference: { defaultDuration: 30 },
    })
  })

  it('builds varied records for the injected local day', () => {
    const scenario = buildFixtureScenario('today', clock)

    expect(scenario.records.length).toBeGreaterThan(0)
    expect(scenario.records.every((record) => record.date === '2026-07-15')).toBe(true)
    expect(scenario.records.some((record) => record.takeaway === undefined)).toBe(true)
    expect(new Set(scenario.records.flatMap((record) => record.tags)).size).toBeGreaterThan(1)
  })

  it('builds history across same-day records, gaps, and a previous month', () => {
    const scenario = buildFixtureScenario('history', clock)
    const dates = scenario.records.map((record) => record.date)
    const chronologicalDates = [...new Set(dates)].sort()
    const hasGap = chronologicalDates.slice(1).some((date, index) => {
      const previousDate = chronologicalDates[index]
      return Date.parse(date) - Date.parse(previousDate) > 24 * 60 * 60 * 1000
    })

    expect(dates.filter((date) => date === '2026-07-15').length).toBeGreaterThan(1)
    expect(new Set(dates).size).toBeGreaterThan(2)
    expect(hasGap).toBe(true)
    expect(dates.some((date) => date.startsWith('2026-06-'))).toBe(true)
  })

  it('marks read-error as a simulated repository failure', () => {
    const scenario = buildFixtureScenario('read-error', clock)

    expect(scenario.records).toEqual([])
    expect(scenario.readError).toBeInstanceOf(Error)
  })
})
