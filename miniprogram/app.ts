import {
  createCloudDiagnostics,
  initializeCloudBase,
} from './cloud/connection'
import { applyLaunchFixture, createDevFixtureTools } from './fixtures/seed'
import { useCloudRepositories } from './repositories/composition'
import { syncNavigationTheme } from './utils/theme'

App<IAppOption>({
  globalData: {},
  cloudStatus: { state: 'unavailable', message: '微信云开发尚未初始化。' },
  fixtureReady: Promise.resolve(),
  onLaunch(options) {
    const { envVersion } = wx.getAccountInfoSync().miniProgram
    this.cloudStatus = initializeCloudBase()

    if (envVersion === 'develop' && options.query.dataSource === 'cloud') {
      useCloudRepositories()
    }

    this.fixtureReady = applyLaunchFixture(options.query.fixture)

    if (envVersion === 'develop') {
      this.cloudDiagnostics = createCloudDiagnostics()
      this.devFixtures = createDevFixtureTools()
    }

    syncNavigationTheme()

    wx.onThemeChange(({ theme }) => {
      syncNavigationTheme(theme)
    })
  },
})
