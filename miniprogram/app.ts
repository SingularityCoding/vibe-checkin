import { syncNavigationTheme } from './utils/theme'

App<IAppOption>({
  globalData: {},
  onLaunch() {
    syncNavigationTheme()

    wx.onThemeChange(({ theme }) => {
      syncNavigationTheme(theme)
    })
  },
})
