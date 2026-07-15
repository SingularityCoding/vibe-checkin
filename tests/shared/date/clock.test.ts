import { describe, expect, it } from 'vitest'

import { FixedClock } from '../../../miniprogram/shared/date/clock'

describe('FixedClock', () => {
  it('returns a stable copy of the configured local time', () => {
    const clock = new FixedClock(new Date(2026, 6, 15, 10, 30))
    const first = clock.now()
    first.setDate(1)

    expect(clock.today()).toBe('2026-07-15')
    expect(clock.now().getDate()).toBe(15)
  })

  it('rejects an invalid date', () => {
    expect(() => new FixedClock(new Date(Number.NaN))).toThrow('FixedClock requires a valid date')
  })
})
