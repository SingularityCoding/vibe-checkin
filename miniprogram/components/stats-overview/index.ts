Component({
  properties: {
    loadState: {
      type: String,
      value: 'loading',
    },
    model: {
      type: Object,
      value: {
        hasRecords: false,
        currentStreak: 0,
        longestStreak: 0,
        checkInDays: 0,
        totalMinutes: 0,
      },
    },
  },
  methods: {
    onRetry() {
      this.triggerEvent('retry')
    },
    onCreateRecord() {
      this.triggerEvent('create-record')
    },
  },
})
