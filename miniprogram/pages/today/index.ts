import { syncNavigationTheme } from '../../utils/theme'

type WeekDay = {
  date: number
  label: string
  isToday: boolean
}

const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

const getTodayPresentation = (): { todayLabel: string; week: WeekDay[] } => {
  const today = new Date()
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - 6 + index)

    return {
      date: date.getDate(),
      label: weekLabels[date.getDay()],
      isToday: index === 6,
    }
  })

  return {
    todayLabel: `${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日 · 星期${weekLabels[today.getDay()]}`,
    week,
  }
}

Page({
  data: getTodayPresentation(),
  onShow() {
    syncNavigationTheme()
  },
  methods: {
    openRecordEditor() {
      wx.navigateTo({ url: '/pages/record-edit/index?mode=create&from=today' })
    },
    openSettings() {
      wx.navigateTo({ url: '/pages/settings/index' })
    },
  },
})
