import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'
import { addLocalDays, parseLocalDate } from '../../shared/date/local-date'

export type StructuredFilterValue = {
  date?: string
  tag?: string
}

export type StructuredFilterDateOption = {
  value: string
  label: string
}

export type StructuredFilterOptions = {
  dates: StructuredFilterDateOption[]
  tags: string[]
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export const buildStructuredFilterOptions = (
  records: readonly LearningRecord[],
  clock: Clock,
): StructuredFilterOptions => {
  const today = clock.today()

  const dates: StructuredFilterDateOption[] = []

  for (let i = -6; i <= 0; i++) {
    const value = addLocalDays(today, i)
    const isToday = value === today
    const dayOfWeek = parseLocalDate(value).getDay()

    dates.push({
      value,
      label: isToday ? '今' : WEEKDAY_LABELS[dayOfWeek],
    })
  }

  const sortedRecords = [...records].sort((a, b) => b.createdAt - a.createdAt)
  const seen = new Set<string>()
  const tags: string[] = []

  for (const record of sortedRecords) {
    for (const tag of record.tags) {
      const trimmed = tag.trim()

      if (trimmed.length === 0) {
        continue
      }

      if (!seen.has(trimmed)) {
        seen.add(trimmed)
        tags.push(trimmed)
      }
    }
  }

  return { dates, tags }
}

export const applyStructuredFilters = (
  records: readonly LearningRecord[],
  value: StructuredFilterValue,
): LearningRecord[] => {
  let result = [...records]

  if (value.date !== undefined) {
    const date = value.date
    result = result.filter((r) => r.date === date)
  }

  if (value.tag !== undefined) {
    const tag = value.tag
    result = result.filter((r) => r.tags.includes(tag))
  }

  return result
}
