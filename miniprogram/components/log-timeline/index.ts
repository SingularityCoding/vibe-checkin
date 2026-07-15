Component({
  properties: {
    loadState: {
      type: String,
      value: 'loading',
    },
    summary: {
      type: Object,
      value: { checkInDays: 0, recordCount: 0, totalMinutes: 0 },
    },
    groups: {
      type: Array,
      value: [],
    },
  },
  methods: {
    onRetry() {
      this.triggerEvent('retry')
    },
    onCreateRecord() {
      this.triggerEvent('create-record')
    },
    onOpenRecord(event: WechatMiniprogram.TouchEvent) {
      const { id } = event.currentTarget.dataset as { id?: string }

      if (id) {
        this.triggerEvent('open-record', { id })
      }
    },
  },
})
