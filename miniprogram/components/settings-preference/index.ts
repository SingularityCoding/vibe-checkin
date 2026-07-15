import type { LearningPreference } from '../../domain/learning-preference'

const defaultPreference: LearningPreference = { defaultDuration: 30 }

Component({
  properties: {
    preference: {
      type: Object,
      value: defaultPreference,
    },
    saving: {
      type: Boolean,
      value: false,
    },
    saveError: {
      type: String,
      value: '',
    },
  },
  methods: {
    emitSavePreference(defaultDuration: number) {
      this.triggerEvent('save-preference', { defaultDuration })
    },
  },
})
