import { syncNavigationTheme } from '../../utils/theme'

Page({
  onShow() {
    syncNavigationTheme()
  },
  methods: {
    showStarterKitNotice() {
      wx.showToast({
        title: '保存逻辑将在课堂需求中实现',
        icon: 'none',
      })
    },
  },
})
