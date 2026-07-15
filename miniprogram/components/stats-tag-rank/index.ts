Component({
  properties: {
    items: {
      type: Array,
      value: [],
    },
  },
  methods: {
    onSelectTag(event: WechatMiniprogram.TouchEvent) {
      const { tag } = event.currentTarget.dataset as { tag?: string }

      if (tag) {
        this.triggerEvent('select-tag', { tag })
      }
    },
  },
})
