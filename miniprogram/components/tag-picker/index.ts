import {
  RECORD_TAG_MAX_COUNT,
  RECORD_TAG_MAX_LENGTH,
} from '../../domain/constraints'
import { normalizeSelectedTags } from '../../features/tag-picker/index'

type SuggestionItem = {
  tag: string
  selected: boolean
}

const buildSuggestionItems = (
  suggestedTags: readonly string[],
  selectedTags: readonly string[],
): SuggestionItem[] =>
  suggestedTags.map((tag) => ({ tag, selected: selectedTags.indexOf(tag) > -1 }))

Component({
  properties: {
    selectedTags: {
      type: Array,
      value: [] as string[],
    },
    suggestedTags: {
      type: Array,
      value: [] as string[],
    },
  },
  data: {
    inputValue: '',
    errorMessage: '',
    suggestionItems: [] as SuggestionItem[],
    maxTagCount: RECORD_TAG_MAX_COUNT,
    maxTagLength: RECORD_TAG_MAX_LENGTH,
  },
  observers: {
    'selectedTags, suggestedTags'(selectedTags: string[], suggestedTags: string[]) {
      this.setData({ suggestionItems: buildSuggestionItems(suggestedTags, selectedTags) })
    },
  },
  methods: {
    emitChange(tags: string[]) {
      this.triggerEvent('change', { tags: normalizeSelectedTags(tags) })
    },
    onInputChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
      this.setData({ inputValue: event.detail.value, errorMessage: '' })
    },
    onToggleSuggested(event: WechatMiniprogram.TouchEvent) {
      const { tag } = event.currentTarget.dataset as { tag?: string }

      if (!tag) {
        return
      }

      const selectedTags: string[] = this.data.selectedTags

      if (selectedTags.indexOf(tag) > -1) {
        this.setData({ errorMessage: '' })
        this.emitChange(selectedTags.filter((selected) => selected !== tag))
        return
      }

      if (selectedTags.length >= RECORD_TAG_MAX_COUNT) {
        this.setData({ errorMessage: `最多选择 ${RECORD_TAG_MAX_COUNT} 个学习主题` })
        return
      }

      this.setData({ errorMessage: '' })
      this.emitChange([...selectedTags, tag])
    },
    onRemoveTag(event: WechatMiniprogram.TouchEvent) {
      const { tag } = event.currentTarget.dataset as { tag?: string }

      if (!tag) {
        return
      }

      const selectedTags: string[] = this.data.selectedTags

      this.setData({ errorMessage: '' })
      this.emitChange(selectedTags.filter((selected) => selected !== tag))
    },
    onConfirmInput() {
      const tag = this.data.inputValue.trim()
      const selectedTags: string[] = this.data.selectedTags

      if (!tag) {
        this.setData({ errorMessage: '请输入学习主题' })
        return
      }

      if (tag.length > RECORD_TAG_MAX_LENGTH) {
        this.setData({ errorMessage: `学习主题最多 ${RECORD_TAG_MAX_LENGTH} 个字符` })
        return
      }

      if (selectedTags.indexOf(tag) > -1) {
        this.setData({ inputValue: '', errorMessage: '这个主题已经选择过了' })
        return
      }

      if (selectedTags.length >= RECORD_TAG_MAX_COUNT) {
        this.setData({ errorMessage: `最多选择 ${RECORD_TAG_MAX_COUNT} 个学习主题` })
        return
      }

      this.setData({ inputValue: '', errorMessage: '' })
      this.emitChange([...selectedTags, tag])
    },
  },
})
