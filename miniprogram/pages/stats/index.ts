import type { LoadState } from '../../domain/load-state'
import { buildStatisticsOverview } from '../../features/statistics-overview/index'
import { buildMonthCalendar } from '../../features/stats-calendar/index'
import { buildSevenDayTrend } from '../../features/stats-seven-day-trend/index'
import { buildTagRank } from '../../features/stats-tag-rank/index'
import { isFixtureReady } from '../../fixtures/ready'
import { recordRepository } from '../../repositories/record'
import { SystemClock } from '../../shared/date/clock'
import {
  buildCreateRecordRoute,
  buildLogFilterRoute,
} from '../../shared/navigation/routes'
import { syncNavigationTheme } from '../../utils/theme'

const clock = new SystemClock()

Page({
  data: {
    loadState: 'loading' as LoadState,
    overview: buildStatisticsOverview([], clock),
    calendar: buildMonthCalendar([], clock),
    trend: buildSevenDayTrend([], clock),
    tagRank: buildTagRank([]),
  },
  async onShow() {
    syncNavigationTheme()
    this.getTabBar().init()

    if (!(await isFixtureReady())) {
      this.setData({ loadState: 'error' })
      return
    }

    await this.loadRecords()
  },
  async loadRecords() {
    this.setData({ loadState: 'loading' })

    try {
      const records = await recordRepository.list()
      this.setData({
        loadState: 'ready',
        overview: buildStatisticsOverview(records, clock),
        calendar: buildMonthCalendar(records, clock),
        trend: buildSevenDayTrend(records, clock),
        tagRank: buildTagRank(records),
      })
    } catch {
      this.setData({ loadState: 'error' })
    }
  },
  retryLoad() {
    void this.loadRecords()
  },
  openRecordEditor() {
    wx.navigateTo({ url: buildCreateRecordRoute('stats') })
  },
  openLogByDate(event: WechatMiniprogram.CustomEvent<{ date: string }>) {
    wx.reLaunch({ url: buildLogFilterRoute({ date: event.detail.date }) })
  },
  openLogByTag(event: WechatMiniprogram.CustomEvent<{ tag: string }>) {
    wx.reLaunch({ url: buildLogFilterRoute({ tag: event.detail.tag }) })
  },
})
