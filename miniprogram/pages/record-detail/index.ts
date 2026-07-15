import type { LoadState } from '../../domain/load-state'
import {
  buildRecordDetail,
  type RecordDetailViewModel,
} from '../../features/record-detail/index'
import { isFixtureReady } from '../../fixtures/ready'
import { recordRepository } from '../../repositories/record'
import {
  buildEditRecordRoute,
  getMainTabRoute,
  type RecordListTab,
} from '../../shared/navigation/routes'
import { syncNavigationTheme } from '../../utils/theme'

const parseReturnTab = (value: string | undefined): RecordListTab =>
  value === 'today' ? 'today' : 'log'

Page({
  data: {
    id: '',
    returnTo: 'log' as RecordListTab,
    loadState: 'loading' as LoadState,
    model: null as RecordDetailViewModel | null,
    errorMessage: '',
  },
  onLoad(options) {
    this.setData({
      id: options.id ?? '',
      returnTo: parseReturnTab(options.from),
    })
  },
  async onShow() {
    syncNavigationTheme()

    if (!(await isFixtureReady())) {
      this.setData({
        loadState: 'error',
        errorMessage: '测试场景准备失败，请检查编译模式后重新编译。',
      })
      return
    }

    await this.loadRecord()
  },
  async loadRecord() {
    if (!this.data.id) {
      this.setData({ loadState: 'ready', model: null })
      return
    }

    this.setData({ loadState: 'loading', errorMessage: '' })

    try {
      const record = await recordRepository.get(this.data.id)
      this.setData({
        loadState: 'ready',
        model: record ? buildRecordDetail(record) : null,
      })
    } catch {
      this.setData({
        loadState: 'error',
        errorMessage: '学习记录读取失败，请稍后重试。',
      })
    }
  },
  retryLoad() {
    void this.loadRecord()
  },
  openEditRecord() {
    if (!this.data.id) {
      return
    }

    wx.navigateTo({ url: buildEditRecordRoute(this.data.id, this.data.returnTo) })
  },
  returnToLog() {
    wx.switchTab({ url: getMainTabRoute('log') })
  },
})
