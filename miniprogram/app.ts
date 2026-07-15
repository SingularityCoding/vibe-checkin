import { createDevFixtureTools } from './fixtures/seed'
import { syncNavigationTheme } from './utils/theme'

App<IAppOption>({
  globalData: {},
  onLaunch() {
    const { envVersion } = wx.getAccountInfoSync().miniProgram

    if (envVersion === 'develop') {
      this.devFixtures = createDevFixtureTools()
    }

    syncNavigationTheme()

    wx.onThemeChange(({ theme }) => {
      syncNavigationTheme(theme)
    })
  },
})
