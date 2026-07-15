/// <reference path="./types/index.d.ts" />

type DevFixtureTools = import('../miniprogram/fixtures/seed').DevFixtureTools

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
  }
  devFixtures?: DevFixtureTools
  fixtureReady: Promise<void>
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}
