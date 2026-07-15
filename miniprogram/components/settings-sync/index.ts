Component({
  properties: {
    syncInfo: {
      type: Object,
      value: { state: 'neutral', text: '' },
    },
  },
  methods: {
    onReload() {
      this.triggerEvent('reload')
    },
  },
})
