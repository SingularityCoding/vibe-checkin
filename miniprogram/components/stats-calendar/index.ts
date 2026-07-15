Component({
  data: {
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
  },
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
