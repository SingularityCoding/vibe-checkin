interface DateChip {
  value: string
  label: string
  selected: boolean
}

interface TagChip {
  tag: string
  label: string
  selected: boolean
}

const buildDateChips = (
  options: { value: string; label: string }[],
  selectedDate: string | undefined,
): DateChip[] => {
  const chips: DateChip[] = options.map((opt) => ({
    value: opt.value,
    label: opt.label,
    selected: opt.value === selectedDate,
  }))

  if (selectedDate !== undefined && !options.some((opt) => opt.value === selectedDate)) {
    chips.push({ value: selectedDate, label: selectedDate, selected: true })
  }

  return chips
}

const buildTagChips = (options: string[], selectedTag: string | undefined): TagChip[] => {
  const chips: TagChip[] = [
    { tag: '', label: '全部', selected: !selectedTag },
  ]

  for (const tag of options) {
    chips.push({ tag, label: tag, selected: tag === selectedTag })
  }

  return chips
}

Component({
  properties: {
    dateOptions: {
      type: Array,
      value: [],
    },
    tagOptions: {
      type: Array,
      value: [],
    },
    value: {
      type: Object,
      value: {},
    },
  },

  data: {
    dateChips: [] as DateChip[],
    tagChips: [] as TagChip[],
    hasActiveFilter: false,
  },

  observers: {
    'dateOptions, tagOptions, value'(dateOptions: { value: string; label: string }[], tagOptions: string[], value: { date?: string; tag?: string }) {
      this.setData({
        dateChips: buildDateChips(dateOptions, value.date),
        tagChips: buildTagChips(tagOptions, value.tag),
        hasActiveFilter: Boolean(value.date || value.tag),
      })
    },
  },

  methods: {
    onDateTap(event: WechatMiniprogram.TouchEvent) {
      const { value: tappedDate } = event.currentTarget.dataset as { value: string }
      const current = this.properties.value as { date?: string; tag?: string }
      const nextDate = tappedDate === current.date ? undefined : tappedDate

      this.triggerEvent('change', { value: { tag: current.tag, date: nextDate } })
    },

    onTagTap(event: WechatMiniprogram.TouchEvent) {
      const { tag: tappedTag } = event.currentTarget.dataset as { tag: string }
      const current = this.properties.value as { date?: string; tag?: string }
      const nextTag = tappedTag === '' || tappedTag === current.tag ? undefined : tappedTag

      this.triggerEvent('change', { value: { date: current.date, tag: nextTag } })
    },

    onClear() {
      this.triggerEvent('clear')
    },
  },
})
