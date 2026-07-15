import type { RecordInput } from '../../domain/learning-record'
import {
  createInitialDraft,
  type RecordDraft,
  validateRecordDraft,
} from '../../features/record-create/index'
import { collectSuggestedTags } from '../../features/tag-picker/index'
import { isFixtureReady } from '../../fixtures/ready'
import { preferenceRepository } from '../../repositories/preference'
import { recordRepository } from '../../repositories/record'
import { SystemClock } from '../../shared/date/clock'
import { parseLocalDate } from '../../shared/date/local-date'
import {
  getMainTabRoute,
  type MainTab,
  type RecordListTab,
} from '../../shared/navigation/routes'
import { syncNavigationTheme } from '../../utils/theme'

type EditorMode = 'create' | 'edit'

const clock = new SystemClock()
const emptyDraft: RecordDraft = {
  content: '',
  duration: 30,
  tags: [],
  takeaway: '',
}

const parseMode = (value: string | undefined): EditorMode => (value === 'edit' ? 'edit' : 'create')

const parseSource = (value: string | undefined): MainTab => {
  if (value === 'log' || value === 'stats') {
    return value
  }

  return 'today'
}

const parseReturnTab = (value: string | undefined): RecordListTab =>
  value === 'today' ? 'today' : 'log'

const formatDateLabel = (date: Date): string =>
  `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`

Page({
  data: {
    mode: 'create' as EditorMode,
    id: '',
    source: 'today' as MainTab,
    returnTo: 'log' as RecordListTab,
    dateLabel: `今天 · ${formatDateLabel(clock.now())}`,
    initialDraft: emptyDraft,
    suggestedTags: [] as string[],
    saving: false,
    saveError: '',
  },
  async onLoad(options) {
    const mode = parseMode(options.mode)

    this.setData({
      mode,
      id: options.id ?? '',
      source: parseSource(options.from),
      returnTo: parseReturnTab(options.returnTo),
      dateLabel: `今天 · ${formatDateLabel(clock.now())}`,
    })

    if (!(await isFixtureReady())) {
      this.setData({ saveError: '测试场景准备失败，请检查编译模式后重新编译。' })
      return
    }

    await this.loadInitialDraft()
  },
  onReady() {
    wx.setNavigationBarTitle({ title: this.data.mode === 'edit' ? '编辑记录' : '记录学习' })
  },
  onShow() {
    syncNavigationTheme()
  },
  async loadInitialDraft() {
    try {
      const records = await recordRepository.list()
      const suggestedTags = collectSuggestedTags(records)

      if (this.data.mode === 'edit') {
        const record = this.data.id ? await recordRepository.get(this.data.id) : null

        if (!record) {
          this.setData({ suggestedTags, saveError: '这条学习记录已不存在或已被删除。' })
          return
        }

        this.setData({
          suggestedTags,
          dateLabel: formatDateLabel(parseLocalDate(record.date)),
          initialDraft: {
            content: record.content,
            duration: record.duration,
            tags: [...record.tags],
            takeaway: record.takeaway ?? '',
          },
        })
        return
      }

      const preference = await preferenceRepository.get()
      this.setData({ suggestedTags, initialDraft: createInitialDraft(preference) })
    } catch {
      this.setData({ saveError: '记录表单初始化失败，请返回后重试。' })
    }
  },
  async submitRecord(event: WechatMiniprogram.CustomEvent<{ draft: RecordInput }>) {
    if (this.data.saving) {
      return
    }

    const validation = validateRecordDraft(event.detail.draft)

    if (!validation.isValid) {
      this.setData({ saveError: '请检查学习内容和时长后再保存。' })
      return
    }

    this.setData({ saving: true, saveError: '' })

    try {
      if (this.data.mode === 'edit') {
        await recordRepository.update(this.data.id, validation.value)
      } else {
        await recordRepository.create(validation.value)
      }

      wx.disableAlertBeforeUnload()
      wx.navigateBack({
        fail: () => {
          wx.switchTab({ url: getMainTabRoute(this.data.source) })
        },
      })
    } catch {
      this.setData({ saving: false, saveError: '保存失败，已填写的内容仍然保留。' })
    }
  },
  onDirtyChange(event: WechatMiniprogram.CustomEvent<{ dirty: boolean }>) {
    if (event.detail.dirty) {
      wx.enableAlertBeforeUnload({ message: '还有未保存的修改，确定要离开吗？' })
    } else {
      wx.disableAlertBeforeUnload()
    }
  },
  async deleteRecord() {
    if (!this.data.id) {
      return
    }

    this.setData({ saving: true, saveError: '' })

    try {
      await recordRepository.remove(this.data.id)
      wx.disableAlertBeforeUnload()
      wx.switchTab({ url: getMainTabRoute(this.data.returnTo) })
    } catch {
      this.setData({ saving: false, saveError: '删除失败，原记录没有改变。' })
    }
  },
})
