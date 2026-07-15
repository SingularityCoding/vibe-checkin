import { describe, expect, it } from 'vitest'

import { getNavigationTheme, resolveTheme } from '../../miniprogram/utils/theme'

describe('resolveTheme', () => {
  it('uses light mode for an absent or unsupported system theme', () => {
    expect(resolveTheme()).toBe('light')
    expect(resolveTheme('system')).toBe('light')
  })

  it('preserves the supported dark system theme', () => {
    expect(resolveTheme('dark')).toBe('dark')
  })
})

describe('getNavigationTheme', () => {
  it('uses a warm chrome color for each theme', () => {
    expect(getNavigationTheme('light')).toEqual({
      backgroundColor: '#FFF8F0',
      frontColor: '#000000',
    })
    expect(getNavigationTheme('dark')).toEqual({
      backgroundColor: '#211A16',
      frontColor: '#ffffff',
    })
  })
})
