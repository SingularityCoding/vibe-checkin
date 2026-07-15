import type { RecordDraft } from '../../features/record-create/index'

const emptyDraft: RecordDraft = {
  content: '',
  duration: 30,
  tags: [],
  takeaway: '',
}

Component({
  properties: {
    mode: {
      type: String,
      value: 'create',
    },
    initialDraft: {
      type: Object,
      value: emptyDraft,
    },
    suggestedTags: {
      type: Array,
      value: [] as string[],
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
    onTagsChange(event: WechatMiniprogram.CustomEvent<{ tags: string[] }>) {
      this.setData({ 'initialDraft.tags': event.detail.tags })
    },
    emitDeleteRecord() {
      this.triggerEvent('delete-record')
    },
  },
})
