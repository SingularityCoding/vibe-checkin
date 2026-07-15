Component({
  properties: {
    keyword: {
      type: String,
      value: '',
    },
    resultSummary: {
      type: Object,
      value: { recordCount: 0, totalMinutes: 0 },
    },
    hasActiveFilters: {
      type: Boolean,
      value: false,
    },
  },
  methods: {
    emitKeywordChange(keyword: string) {
      this.triggerEvent('keyword-change', { keyword })
    },
    emitClearAll() {
      this.triggerEvent('clear-all')
    },
  },
})
