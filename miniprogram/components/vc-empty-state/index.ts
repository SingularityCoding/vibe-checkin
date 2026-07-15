Component({
  properties: {
    icon: {
      type: String,
      value: 'book-open',
    },
    title: {
      type: String,
      value: '',
    },
    description: {
      type: String,
      value: '',
    },
    actionText: {
      type: String,
      value: '',
    },
  },
  methods: {
    onAction() {
      this.triggerEvent('action')
    },
  },
})
