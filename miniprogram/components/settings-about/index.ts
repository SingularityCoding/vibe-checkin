Component({
  properties: {
    version: {
      type: String,
      value: '0.1.0',
    },
  },
  methods: {
    onOpenPrivacy() {
      this.triggerEvent('open-privacy')
    },
  },
})
