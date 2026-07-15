Component({
  properties: {
    week: {
      type: Array,
      value: [],
    },
    todayRecords: {
      type: Array,
      value: [],
    },
  },
  methods: {
    onOpenRecord(event: WechatMiniprogram.TouchEvent) {
      const { id } = event.currentTarget.dataset as { id?: string }

      if (id) {
        this.triggerEvent('open-record', { id })
      }
    },
  },
})
