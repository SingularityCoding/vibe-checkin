Component({
  properties: {
    model: {
      type: Object,
      value: { visible: false, monthLabel: '', days: [] },
    },
  },
  methods: {
    onSelectDate(event: WechatMiniprogram.TouchEvent) {
      const { date } = event.currentTarget.dataset as { date?: string }

      if (date) {
        this.triggerEvent('select-date', { date })
      }
    },
  },
})
