import type { LearningRecord } from '../../domain/learning-record'
import type { LoadState } from '../../domain/load-state'
import {
  applyKeywordFilter,
  buildFilterResultSummary,
} from '../../features/log-keyword-filter/index'
import {
  applyStructuredFilters,
  buildStructuredFilterOptions,
  type StructuredFilterValue,
} from '../../features/log-structured-filter/index'
import { buildLogTimeline } from '../../features/log-timeline/index'
import { isFixtureReady } from '../../fixtures/ready'
import { recordRepository } from '../../repositories/record'
import { SystemClock } from '../../shared/date/clock'
import { isLocalDate } from '../../shared/date/local-date'
import {
  buildCreateRecordRoute,
  buildRecordDetailRoute,
} from '../../shared/navigation/routes'
import { syncNavigationTheme } from '../../utils/theme'

const clock = new SystemClock()

const parseInitialFilter = (
  options: Record<string, string | undefined>,
): StructuredFilterValue => {
  const date = options.date && isLocalDate(options.date) ? options.date : undefined
  const tag = options.tag?.trim() || undefined

  return { date, tag }
}

Page({
  data: {
    loadState: 'loading' as LoadState,
    records: [] as LearningRecord[],
    structuredFilter: {} as StructuredFilterValue,
    keyword: '',
    filterOptions: buildStructuredFilterOptions([], clock),
    resultSummary: buildFilterResultSummary([]),
    timeline: buildLogTimeline([]),
    hasActiveFilters: false,
  },
  onLoad(options) {
    this.setData({ structuredFilter: parseInitialFilter(options) })
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
      this.setData({ loadState: 'ready', records })
      this.rebuildView(records, this.data.structuredFilter, this.data.keyword)
    } catch {
      this.setData({ loadState: 'error' })
    }
  },
  rebuildView(
    records: readonly LearningRecord[],
    structuredFilter: StructuredFilterValue,
    keyword: string,
  ) {
    const structuredRecords = applyStructuredFilters(records, structuredFilter)
    const filteredRecords = applyKeywordFilter(structuredRecords, keyword)

    this.setData({
      structuredFilter,
      keyword,
      filterOptions: buildStructuredFilterOptions(records, clock),
      resultSummary: buildFilterResultSummary(filteredRecords),
      timeline: buildLogTimeline(filteredRecords),
      hasActiveFilters: Boolean(structuredFilter.date || structuredFilter.tag || keyword.trim()),
    })
  },
  retryLoad() {
    void this.loadRecords()
  },
  onStructuredFilterChange(
    event: WechatMiniprogram.CustomEvent<{ value: StructuredFilterValue }>,
  ) {
    this.rebuildView(this.data.records, event.detail.value, this.data.keyword)
  },
  clearStructuredFilter() {
    this.rebuildView(this.data.records, {}, this.data.keyword)
  },
  onKeywordChange(event: WechatMiniprogram.CustomEvent<{ keyword: string }>) {
    this.rebuildView(this.data.records, this.data.structuredFilter, event.detail.keyword)
  },
  clearAllFilters() {
    this.rebuildView(this.data.records, {}, '')
  },
  openRecordEditor() {
    wx.navigateTo({ url: buildCreateRecordRoute('log') })
  },
  openRecordDetail(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
    wx.navigateTo({ url: buildRecordDetailRoute(event.detail.id, 'log') })
  },
})
