import type { LearningRecord } from '../../domain/learning-record'

export type FilterResultSummary = {
  recordCount: number
  totalMinutes: number
}

export const applyKeywordFilter = (
  records: readonly LearningRecord[],
  _keyword: string,
): LearningRecord[] => [...records]

export const buildFilterResultSummary = (_records: readonly LearningRecord[]): FilterResultSummary => ({
  recordCount: 0,
  totalMinutes: 0,
})
