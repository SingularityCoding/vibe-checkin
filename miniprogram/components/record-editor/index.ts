import type { RecordDraft } from '../../features/record-create/index'

const emptyDraft: RecordDraft = {
  content: '',
  duration: 30,
  tags: [],
  takeaway: '',
}

Component({
  data: {
    suggestedTags: [] as string[],
  },
  properties: {
    mode: {
      type: String,
      value: 'create',
    },
    initialDraft: {
      type: Object,
      value: emptyDraft,
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
    emitSubmit() {
      this.triggerEvent('submit', { draft: this.data.initialDraft })
    },
    emitDirtyChange(dirty: boolean) {
      this.triggerEvent('dirty-change', { dirty })
    },
    onTagsChange(_event: WechatMiniprogram.CustomEvent<{ tags: string[] }>) {},
    emitDeleteRecord() {
      this.triggerEvent('delete-record')
    },
  },
})
