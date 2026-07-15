import { afterEach, describe, expect, it, vi } from 'vitest'

import { getNavigationTheme, resolveTheme, syncNavigationTheme } from '../../miniprogram/utils/theme'

afterEach(() => {
  vi.unstubAllGlobals()
})

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

describe('syncNavigationTheme', () => {
  it('reads the current theme from app base info', () => {
    const getAppBaseInfo = vi.fn(() => ({ theme: 'dark' }))
    const setNavigationBarColor = vi.fn()

    vi.stubGlobal('wx', { getAppBaseInfo, setNavigationBarColor })

    expect(syncNavigationTheme()).toBe('dark')
    expect(getAppBaseInfo).toHaveBeenCalledOnce()
    expect(setNavigationBarColor).toHaveBeenCalledWith({
      backgroundColor: '#211A16',
      frontColor: '#ffffff',
      animation: {
        duration: 0,
        timingFunc: 'linear',
      },
    })
  })
})
