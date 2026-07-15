import {
  cancelRemoveAllConfirmation,
  confirmRemoveAll,
  createRemoveAllConfirmState,
  requestRemoveAllConfirmation,
  type RemoveAllConfirmState,
} from '../../features/remove-all-records/index'

Component({
  properties: {
    removing: {
      type: Boolean,
      value: false,
      // 删除请求开始后收起二次确认面板，防止它残留在一个正在进行中的
      // 请求之下、诱导用户再次提交。
      observer(removing: boolean) {
        if (removing) {
          this.setData({ step: createRemoveAllConfirmState().step })
        }
      },
    },
    removeError: {
      type: String,
      value: '',
    },
  },
  data: {
    step: createRemoveAllConfirmState().step,
  },
  methods: {
    confirmState(): RemoveAllConfirmState {
      return { step: this.data.step as RemoveAllConfirmState['step'] }
    },
    onRequestConfirm() {
      if (this.data.removing) {
        return
      }

      this.setData({ step: requestRemoveAllConfirmation(this.confirmState()).step })
    },
    onCancelConfirm() {
      if (this.data.removing) {
        return
      }

      this.setData({ step: cancelRemoveAllConfirmation(this.confirmState()).step })
    },
    onConfirmRemoveAll() {
      if (this.data.removing) {
        return
      }

      const { state, confirmed } = confirmRemoveAll(this.confirmState())
      this.setData({ step: state.step })

      // 只有状态机确认过的调用才允许发出 remove-all；意外触发一律忽略。
      if (confirmed) {
        this.triggerEvent('remove-all')
      }
    },
  },
})
