import {
  RECORD_CONTENT_MAX_LENGTH,
  RECORD_DURATION_MAX,
  RECORD_DURATION_MIN,
  RECORD_DURATION_STEP,
  RECORD_TAKEAWAY_MAX_LENGTH,
} from '../../domain/constraints'
import {
  type RecordDraft,
  type RecordDraftErrors,
  validateRecordDraft,
} from '../../features/record-create/index'

const emptyDraft: RecordDraft = {
  content: '',
  duration: 30,
  tags: [],
  takeaway: '',
}

const cloneDraft = (draft: RecordDraft): RecordDraft => ({
  content: draft.content,
  duration: draft.duration,
  tags: [...draft.tags],
  takeaway: draft.takeaway,
})

const draftsEqual = (left: RecordDraft, right: RecordDraft): boolean =>
  left.content === right.content &&
  left.duration === right.duration &&
  (left.takeaway ?? '') === (right.takeaway ?? '') &&
  left.tags.length === right.tags.length &&
  left.tags.every((tag, index) => tag === right.tags[index])

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
  data: {
    draft: emptyDraft,
    errors: {} as RecordDraftErrors,
    attemptedSubmit: false,
    submitting: false,
    dirty: false,
    contentMaxLength: RECORD_CONTENT_MAX_LENGTH,
    durationMin: RECORD_DURATION_MIN,
    durationMax: RECORD_DURATION_MAX,
    durationStep: RECORD_DURATION_STEP,
    takeawayMaxLength: RECORD_TAKEAWAY_MAX_LENGTH,
  },
  observers: {
    initialDraft(value: RecordDraft) {
      this.resetDraft(value)
    },
    saving(value: boolean) {
      if (!value) {
        this.setData({ submitting: false })
      }
    },
  },
  methods: {
    resetDraft(value: RecordDraft) {
      const draft = cloneDraft(value)
      this.setData({ draft, errors: {}, attemptedSubmit: false })
      this.updateDirty(draft)
    },
    updateDraft(patch: Partial<RecordDraft>) {
      const draft = { ...this.data.draft, ...patch }
      const validation = validateRecordDraft(draft)

      this.setData({
        draft,
        errors: this.data.attemptedSubmit ? validation.errors : {},
      })
      this.updateDirty(draft)
    },
    updateDirty(draft: RecordDraft) {
      const dirty = !draftsEqual(draft, this.properties.initialDraft)

      if (dirty !== this.data.dirty) {
        this.setData({ dirty })
        this.triggerEvent('dirty-change', { dirty })
      }
    },
    onContentChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
      this.updateDraft({ content: event.detail.value })
    },
    onDurationChange(event: WechatMiniprogram.CustomEvent<{ value: number }>) {
      this.updateDraft({ duration: Number(event.detail.value) })
    },
    onTakeawayChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
      this.updateDraft({ takeaway: event.detail.value })
    },
    onTagsChange(event: WechatMiniprogram.CustomEvent<{ tags: string[] }>) {
      this.updateDraft({ tags: [...event.detail.tags] })
    },
    onSubmit() {
      if (this.data.submitting || this.properties.saving) {
        return
      }

      const validation = validateRecordDraft(this.data.draft)

      if (!validation.isValid) {
        this.setData({ attemptedSubmit: true, errors: validation.errors })
        return
      }

      this.setData({ submitting: true, attemptedSubmit: true, errors: {} })
      this.triggerEvent('submit', { draft: validation.value })
    },
  },
})
