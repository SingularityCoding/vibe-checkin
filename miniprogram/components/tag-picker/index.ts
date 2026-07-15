import {
  RECORD_TAG_MAX_COUNT,
  RECORD_TAG_MAX_LENGTH,
} from '../../domain/constraints'
import { normalizeSelectedTags } from '../../features/tag-picker'

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
  data: {
    inputValue: '',
    errorMessage: '',
    suggestionItems: [] as Array<{ tag: string; selected: boolean }>,
    maxTagCount: RECORD_TAG_MAX_COUNT,
    maxTagLength: RECORD_TAG_MAX_LENGTH,
  },
  observers: {
    'selectedTags, suggestedTags': function (
      selectedTags: string[],
      suggestedTags: string[],
    ) {
      this._syncSuggestionItems(selectedTags, suggestedTags)
    },
  },
  attached() {
    this._syncSuggestionItems(this.properties.selectedTags, this.properties.suggestedTags)
  },
  methods: {
    _syncSuggestionItems(selectedTags: string[] = [], suggestedTags: string[] = []) {
      const normalizedSelectedTags = normalizeSelectedTags(selectedTags)
      const suggestionItems = suggestedTags.map((tag) => ({
        tag,
        selected: normalizedSelectedTags.includes(tag),
      }))

      this.setData({
        suggestionItems,
        maxTagCount: RECORD_TAG_MAX_COUNT,
        maxTagLength: RECORD_TAG_MAX_LENGTH,
      })
    },
    emitChange(tags: string[]) {
      const normalizedTags = normalizeSelectedTags(tags)
      this.triggerEvent('change', { tags: normalizedTags })
    },
    onInput(event: WechatMiniprogram.CustomEvent) {
      this.setData({
        inputValue: event.detail.value,
        errorMessage: '',
      })
    },
    onAddTag() {
      const rawTag = this.data.inputValue.trim()

      if (!rawTag) {
        this.setData({ errorMessage: '请输入学习主题' })
        return
      }

      if (rawTag.length > RECORD_TAG_MAX_LENGTH) {
        this.setData({ errorMessage: '学习主题最多 12 个字符' })
        return
      }

      const selectedTags = normalizeSelectedTags(this.properties.selectedTags || [])

      if (selectedTags.includes(rawTag)) {
        this.setData({
          inputValue: '',
          errorMessage: '这个主题已经选择过了',
        })
        return
      }

      if (selectedTags.length >= RECORD_TAG_MAX_COUNT) {
        this.setData({ errorMessage: '最多选择 3 个学习主题' })
        return
      }

      const nextTags = [...selectedTags, rawTag]
      this.setData({
        inputValue: '',
        errorMessage: '',
      })
      this.emitChange(nextTags)
    },
    onSelectSuggestion(event: WechatMiniprogram.CustomEvent) {
      const tag = event.currentTarget.dataset.tag as string
      const selectedTags = normalizeSelectedTags(this.properties.selectedTags || [])

      if (selectedTags.includes(tag)) {
        const nextTags = selectedTags.filter((item) => item !== tag)
        this.emitChange(nextTags)
        return
      }

      if (selectedTags.length >= RECORD_TAG_MAX_COUNT) {
        this.setData({ errorMessage: '最多选择 3 个学习主题' })
        return
      }

      const nextTags = [...selectedTags, tag]
      this.emitChange(nextTags)
    },
    onRemoveTag(event: WechatMiniprogram.CustomEvent) {
      const tag = event.currentTarget.dataset.tag as string
      const selectedTags = normalizeSelectedTags(this.properties.selectedTags || [])
      const nextTags = selectedTags.filter((item) => item !== tag)
      this.emitChange(nextTags)
    },
  },
})
