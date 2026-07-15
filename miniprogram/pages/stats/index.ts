import { syncNavigationTheme } from '../../utils/theme'

Page({
  onShow() {
    syncNavigationTheme()
    this.getTabBar().init()
  },
  methods: {
    openRecordEditor() {
      wx.navigateTo({ url: '/pages/record-edit/index?mode=create&from=stats' })
    },
  },
})
