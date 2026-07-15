import type { LoadState } from '../../domain/load-state'
import { buildTodayActivity } from '../../features/today-activity/index'
import { buildTodaySummary } from '../../features/today-summary/index'
import { isFixtureReady } from '../../fixtures/ready'
import { recordRepository } from '../../repositories/record'
import { SystemClock } from '../../shared/date/clock'
import {
  buildCreateRecordRoute,
  buildRecordDetailRoute,
  ROUTES,
} from '../../shared/navigation/routes'
import { syncNavigationTheme } from '../../utils/theme'

const clock = new SystemClock()
const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']

const formatTodayLabel = (date: Date): string =>
  `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · 星期${weekdayLabels[date.getDay()]}`

Page({
  data: {
    todayLabel: formatTodayLabel(clock.now()),
    loadState: 'loading' as LoadState,
    loadError: '',
    summary: buildTodaySummary([], clock),
    activity: buildTodayActivity([], clock),
  },
  async onShow() {
    syncNavigationTheme()
    this.getTabBar().init()
    this.setData({ todayLabel: formatTodayLabel(clock.now()) })

    if (!(await isFixtureReady())) {
      this.setData({
        loadState: 'error',
        loadError: '测试场景准备失败，请检查编译模式后重新编译。',
      })
      return
    }

    await this.loadRecords()
  },
  async loadRecords() {
    this.setData({ loadState: 'loading', loadError: '' })

    try {
      const records = await recordRepository.list()
      this.setData({
        loadState: 'ready',
        summary: buildTodaySummary(records, clock),
        activity: buildTodayActivity(records, clock),
      })
    } catch {
      this.setData({
        loadState: 'error',
        loadError: '今天的学习数据读取失败，请稍后重试。',
      })
    }
  },
  retryLoad() {
    void this.loadRecords()
  },
  openRecordEditor() {
    wx.navigateTo({ url: buildCreateRecordRoute('today') })
  },
  openRecordDetail(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: buildRecordDetailRoute(event.detail.id, 'today') })
  },
  openSettings() {
    wx.navigateTo({ url: ROUTES.settings })
  },
})
