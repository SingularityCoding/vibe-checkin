Component({
  properties: {
    dateOptions: {
      type: Array,
      value: [],
    },
    tagOptions: {
      type: Array,
      value: [],
    },
    value: {
      type: Object,
      value: {},
    },
  },
  methods: {
    emitChange(value: { date?: string; tag?: string }) {
      this.triggerEvent('change', { value })
    },
    emitClear() {
      this.triggerEvent('clear')
    },
  },
})
