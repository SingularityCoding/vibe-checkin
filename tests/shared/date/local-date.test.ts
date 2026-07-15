import { describe, expect, it } from 'vitest'

import {
  addLocalDays,
  compareLocalDates,
  formatLocalDate,
  isLocalDate,
  parseLocalDate,
} from '../../../miniprogram/shared/date/local-date'

describe('local date utilities', () => {
  it('formats and parses a local calendar date without using UTC', () => {
    const date = new Date(2026, 6, 5, 23, 30)

    expect(formatLocalDate(date)).toBe('2026-07-05')

    const parsed = parseLocalDate('2026-07-05')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(6)
    expect(parsed.getDate()).toBe(5)
  })

  it('rejects impossible dates and non-canonical values', () => {
    expect(isLocalDate('2024-02-29')).toBe(true)
    expect(isLocalDate('2026-02-29')).toBe(false)
    expect(isLocalDate('2026-2-09')).toBe(false)
    expect(() => parseLocalDate('2026-04-31')).toThrow('Invalid local date')
    expect(() => formatLocalDate(new Date(Number.NaN))).toThrow('Cannot format an invalid date')
  })

  it('adds days across month and year boundaries', () => {
    expect(addLocalDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addLocalDays('2024-02-29', 1)).toBe('2024-03-01')
    expect(addLocalDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('compares canonical local dates', () => {
    expect(compareLocalDates('2026-07-14', '2026-07-15')).toBe(-1)
    expect(compareLocalDates('2026-07-15', '2026-07-15')).toBe(0)
    expect(compareLocalDates('2026-07-16', '2026-07-15')).toBe(1)
  })
})
