import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'
import { calculateStreakSummary } from '../../shared/date/streak'

export type StatisticsOverviewViewModel = {
  hasRecords: boolean
  currentStreak: number
  longestStreak: number
  checkInDays: number
  totalMinutes: number
}

const EMPTY_OVERVIEW: StatisticsOverviewViewModel = {
  hasRecords: false,
  currentStreak: 0,
  longestStreak: 0,
  checkInDays: 0,
  totalMinutes: 0,
}

export const buildStatisticsOverview = (
  records: readonly LearningRecord[],
  clock: Clock,
): StatisticsOverviewViewModel => {
  if (records.length === 0) {
    return EMPTY_OVERVIEW
  }

  const { current, longest } = calculateStreakSummary(records, clock)
  const checkInDays = new Set(records.map((record) => record.date)).size
  const totalMinutes = records.reduce((total, record) => total + record.duration, 0)

  return {
    hasRecords: true,
    currentStreak: current,
    longestStreak: longest,
    checkInDays,
    totalMinutes,
  }
}
