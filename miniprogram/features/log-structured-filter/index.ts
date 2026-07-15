import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'

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

export const buildStructuredFilterOptions = (
  _records: readonly LearningRecord[],
  _clock: Clock,
): StructuredFilterOptions => ({ dates: [], tags: [] })

export const applyStructuredFilters = (
  records: readonly LearningRecord[],
  _value: StructuredFilterValue,
): LearningRecord[] => [...records]
