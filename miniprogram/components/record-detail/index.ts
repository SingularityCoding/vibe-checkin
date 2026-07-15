Component({
  properties: {
    loadState: {
      type: String,
      value: 'loading',
    },
    model: {
      type: Object,
      value: null,
    },
    errorMessage: {
      type: String,
      value: '',
    },
  },
  methods: {
    onRetry() {
      this.triggerEvent('retry')
    },
    onEditRecord() {
      this.triggerEvent('edit-record')
    },
    onReturnToLog() {
      this.triggerEvent('return-to-log')
    },
  },
})
