Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    removing: {
      type: Boolean,
      value: false,
    },
    removeError: {
      type: String,
      value: '',
    },
  },
  methods: {
    emitRemoveAll() {
      this.triggerEvent('remove-all')
    },
  },
})
