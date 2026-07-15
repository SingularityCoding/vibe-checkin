import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'

export type StatisticsOverviewViewModel = {
  hasRecords: boolean
  currentStreak: number
  longestStreak: number
  checkInDays: number
  totalMinutes: number
}

export const buildStatisticsOverview = (
  _records: readonly LearningRecord[],
  _clock: Clock,
): StatisticsOverviewViewModel => ({
  hasRecords: false,
  currentStreak: 0,
  longestStreak: 0,
  checkInDays: 0,
  totalMinutes: 0,
})
