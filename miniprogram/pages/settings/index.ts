import type { LearningPreference } from '../../domain/learning-preference'
import { createRemoveAllRecordsState } from '../../features/remove-all-records'
import { validateDefaultDuration } from '../../features/preference'
import { formatSyncInfo } from '../../features/sync'
import { preferenceRepository } from '../../repositories/preference'
import { recordRepository } from '../../repositories/record'
import { syncNavigationTheme } from '../../utils/theme'

Page({
  data: {
    preference: { defaultDuration: 30 } as LearningPreference,
    savingPreference: false,
    preferenceError: '',
    syncInfo: formatSyncInfo({ state: 'idle' }),
    dangerState: createRemoveAllRecordsState(),
    loadError: '',
    version: '0.1.0',
  },
  async onShow() {
    syncNavigationTheme()
    await this.loadSettings()
  },
  async loadSettings() {
    this.setData({ loadError: '' })

    try {
      const [preference, syncInfo] = await Promise.all([
        preferenceRepository.get(),
        recordRepository.getSyncInfo(),
      ])

      this.setData({
        preference,
        syncInfo: formatSyncInfo(syncInfo),
      })
    } catch {
      this.setData({ loadError: '设置读取失败，请稍后重新进入。' })
    }
  },
  async savePreference(
    event: WechatMiniprogram.CustomEvent<{ defaultDuration: number }>,
  ) {
    const validation = validateDefaultDuration(event.detail.defaultDuration)

    if (!validation.isValid) {
      this.setData({ preferenceError: validation.error ?? '默认时长不符合要求。' })
      return
    }

    this.setData({ savingPreference: true, preferenceError: '' })

    try {
      const preference = await preferenceRepository.save({
        defaultDuration: validation.value,
      })
      this.setData({ preference, savingPreference: false })
    } catch {
      this.setData({
        savingPreference: false,
        preferenceError: '默认时长保存失败，请重试。',
      })
    }
  },
  async reloadFromCloud() {
    this.setData({
      syncInfo: formatSyncInfo({ state: 'syncing', message: '正在重新同步' }),
    })

    try {
      await recordRepository.reloadFromCloud()
      const syncInfo = await recordRepository.getSyncInfo()
      this.setData({ syncInfo: formatSyncInfo(syncInfo) })
    } catch {
      this.setData({
        syncInfo: formatSyncInfo({ state: 'failed', message: '重新同步失败，请重试' }),
      })
    }
  },
  openPrivacy() {
    wx.showModal({
      title: '隐私说明',
      content: '学习记录按当前微信身份隔离。本项目不会要求你提交密钥、OpenID 或其他私密凭据。',
      showCancel: false,
      confirmText: '知道了',
    })
  },
  async removeAllRecords() {
    this.setData({
      dangerState: {
        ...this.data.dangerState,
        removing: true,
        removeError: '',
      },
    })

    try {
      await recordRepository.removeAllMine()
      this.setData({ dangerState: createRemoveAllRecordsState() })
    } catch {
      this.setData({
        dangerState: {
          ...this.data.dangerState,
          removing: false,
          removeError: '删除失败，原有学习记录没有改变。',
        },
      })
    }
  },
})
