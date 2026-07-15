type DevFixtureTools = import('../miniprogram/fixtures/seed').DevFixtureTools
type CloudDiagnostics = import('../miniprogram/cloud/connection').CloudDiagnostics
type CloudInitializationStatus =
  import('../miniprogram/cloud/connection').CloudInitializationStatus

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
  }
  cloudDiagnostics?: CloudDiagnostics
  cloudStatus: CloudInitializationStatus
  devFixtures?: DevFixtureTools
  fixtureReady: Promise<void>
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}
