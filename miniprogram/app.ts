import { applyLaunchFixture, createDevFixtureTools } from './fixtures/seed'
import { syncNavigationTheme } from './utils/theme'

App<IAppOption>({
  globalData: {},
  fixtureReady: Promise.resolve(),
  onLaunch(options) {
    const { envVersion } = wx.getAccountInfoSync().miniProgram
    this.fixtureReady = applyLaunchFixture(options.query.fixture)

    if (envVersion === 'develop') {
      this.devFixtures = createDevFixtureTools()
    }

    syncNavigationTheme()

    wx.onThemeChange(({ theme }) => {
      syncNavigationTheme(theme)
    })
  },
})
