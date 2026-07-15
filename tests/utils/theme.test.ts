import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveTheme, syncNavigationTheme } from '../../miniprogram/utils/theme'

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

describe('syncNavigationTheme', () => {
  it('reads the current system theme and updates the navigation bar', () => {
    const getAppBaseInfo = vi.fn(() => ({ theme: 'dark' }))
    const setNavigationBarColor = vi.fn()

    vi.stubGlobal('wx', { getAppBaseInfo, setNavigationBarColor })

    expect(syncNavigationTheme()).toBe('dark')
    expect(getAppBaseInfo).toHaveBeenCalledOnce()
    expect(setNavigationBarColor).toHaveBeenCalledOnce()
  })
})
