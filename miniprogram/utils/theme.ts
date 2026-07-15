export type AppTheme = 'light' | 'dark'

type NavigationTheme = {
  backgroundColor: string
  frontColor: '#000000' | '#ffffff'
}

const navigationThemes: Record<AppTheme, NavigationTheme> = {
  light: {
    backgroundColor: '#FFF8F0',
    frontColor: '#000000',
  },
  dark: {
    backgroundColor: '#211A16',
    frontColor: '#ffffff',
  },
}

export const resolveTheme = (theme?: string): AppTheme => (theme === 'dark' ? 'dark' : 'light')

export const getNavigationTheme = (theme: AppTheme): NavigationTheme => navigationThemes[theme]

export const syncNavigationTheme = (systemTheme?: string): AppTheme => {
  const theme = resolveTheme(systemTheme ?? wx.getSystemInfoSync().theme)
  const navigationTheme = getNavigationTheme(theme)

  wx.setNavigationBarColor({
    ...navigationTheme,
    animation: {
      duration: 0,
      timingFunc: 'linear',
    },
  })

  return theme
}
