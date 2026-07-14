import { describe, expect, it } from 'vitest'

import { formatTime } from '../../miniprogram/utils/util'

describe('formatTime', () => {
  it('formats a date as a zero-padded local timestamp', () => {
    const date = new Date(2026, 0, 2, 3, 4, 5)

    expect(formatTime(date)).toBe('2026/01/02 03:04:05')
  })
})
