import {
  RECORD_DURATION_MAX,
  RECORD_DURATION_MIN,
  RECORD_DURATION_STEP,
} from '../../domain/constraints'
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
  data: {
    durationMin: RECORD_DURATION_MIN,
    durationMax: RECORD_DURATION_MAX,
    durationStep: RECORD_DURATION_STEP,
  },
  methods: {
    onDurationChange(event: WechatMiniprogram.CustomEvent<{ value: number }>) {
      this.emitSavePreference(event.detail.value)
    },
    emitSavePreference(defaultDuration: number) {
      this.triggerEvent('save-preference', { defaultDuration })
    },
  },
})
