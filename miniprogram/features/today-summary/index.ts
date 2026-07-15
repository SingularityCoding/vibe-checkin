import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'

export type TodaySummaryViewModel = {
  currentStreak: number
  todayMinutes: number
  todayRecordCount: number
  actionTitle: string
  actionDescription: string
  actionText: string
}

export const buildTodaySummary = (
  _records: readonly LearningRecord[],
  _clock: Clock,
): TodaySummaryViewModel => ({
  currentStreak: 0,
  todayMinutes: 0,
  todayRecordCount: 0,
  actionTitle: '今天还没有开始学习',
  actionDescription: '记录一段学习，轨迹会从今天开始延伸。',
  actionText: '记录第一次学习',
})
