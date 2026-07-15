import type {
  RecordDraft,
  RecordDraftErrors,
} from '../../features/record-create/index'
import { validateRecordDraft } from '../../features/record-create/index'
import {
  RECORD_CONTENT_MAX_LENGTH,
  RECORD_DURATION_MAX,
  RECORD_DURATION_MIN,
  RECORD_DURATION_STEP,
  RECORD_TAKEAWAY_MAX_LENGTH,
} from '../../domain/constraints'

const cloneDraft = (draft: RecordDraft): RecordDraft => ({
  content: draft.content,
  duration: draft.duration,
  tags: [...draft.tags],
  takeaway: draft.takeaway,
})

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

  data: {
    draft: cloneDraft(emptyDraft),
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
    initialDraft(newVal: RecordDraft) {
      this.resetDraft(newVal)
    },
    saving(newVal: boolean) {
      if (!newVal && this.data.submitting) {
        this.setData({ submitting: false })
      }
    },
  },

  lifetimes: {
    attached() {
      this.resetDraft(this.properties.initialDraft)
    },
  },

  methods: {
    resetDraft(newDraft: RecordDraft) {
      const draft = cloneDraft(newDraft)
      this.setData({
        draft,
        errors: {},
        attemptedSubmit: false,
        submitting: false,
        dirty: false,
      })
    },

    computeDirty(draft: RecordDraft): boolean {
      const initial = this.properties.initialDraft
      return (
        (draft.content ?? '') !== (initial.content ?? '') ||
        draft.duration !== initial.duration ||
        (draft.takeaway ?? '') !== (initial.takeaway ?? '') ||
        draft.tags.length !== initial.tags.length ||
        draft.tags.some((t, i) => t !== initial.tags[i])
      )
    },

    applyDraftChange(draft: RecordDraft) {
      const validation = validateRecordDraft(draft)
      const dirty = this.computeDirty(draft)
      const prevDirty = this.data.dirty

      const updates: Record<string, unknown> = { draft, dirty }

      if (this.data.attemptedSubmit) {
        updates.errors = validation.errors
      }

      this.setData(updates)

      if (dirty !== prevDirty) {
        this.triggerEvent('dirty-change', { dirty })
      }
    },

    onContentChange(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
      this.applyDraftChange({ ...this.data.draft, content: e.detail.value })
    },

    onDurationChange(e: WechatMiniprogram.CustomEvent<{ value: number }>) {
      this.applyDraftChange({ ...this.data.draft, duration: e.detail.value })
    },

    onTakeawayChange(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
      this.applyDraftChange({ ...this.data.draft, takeaway: e.detail.value })
    },

    onTagsChange(e: WechatMiniprogram.CustomEvent<{ tags: string[] }>) {
      this.applyDraftChange({ ...this.data.draft, tags: [...e.detail.tags] })
    },

    onSubmit() {
      if (this.data.submitting || this.properties.saving) {
        return
      }

      const validation = validateRecordDraft(this.data.draft)

      if (!validation.isValid) {
        this.setData({ errors: validation.errors, attemptedSubmit: true })
        return
      }

      this.setData({ submitting: true, errors: {} })
      this.triggerEvent('submit', { draft: validation.value })
    },

    emitDeleteRecord() {
      this.triggerEvent('delete-record')
    },
  },
})
