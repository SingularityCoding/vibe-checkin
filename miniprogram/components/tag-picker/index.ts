Component({
  properties: {
    selectedTags: {
      type: Array,
      value: [],
    },
    suggestedTags: {
      type: Array,
      value: [],
    },
  },
  methods: {
    emitChange(tags: string[]) {
      this.triggerEvent('change', { tags })
    },
  },
})
