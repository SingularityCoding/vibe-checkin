import { syncNavigationTheme } from '../../utils/theme'

Page({
  onShow() {
    syncNavigationTheme()
  },
  methods: {
    returnToLog() {
      wx.switchTab({ url: '/pages/log/index' })
    },
  },
})
