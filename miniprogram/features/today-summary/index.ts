import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'
import { calculateStreakSummary } from '../../shared/date/streak'

export type TodayActionState = 'first-time' | 'resume' | 'recorded-today'

export type TodaySummaryViewModel = {
  currentStreak: number
  todayMinutes: number
  todayRecordCount: number
  actionState: TodayActionState
  actionTitle: string
  actionDescription: string
  actionText: string
}

export const buildTodaySummary = (
  records: readonly LearningRecord[],
  clock: Clock,
): TodaySummaryViewModel => {
  const today = clock.today()
  const todayRecords = records.filter((record) => record.date === today)
  const todayRecordCount = todayRecords.length
  const todayMinutes = todayRecords.reduce((total, record) => total + record.duration, 0)
  const { current: currentStreak } = calculateStreakSummary(records, clock)

  if (records.length === 0) {
    return {
      currentStreak,
      todayMinutes,
      todayRecordCount,
      actionState: 'first-time',
      actionTitle: '今天还没有开始学习',
      actionDescription: '记录一段学习，轨迹会从今天开始延伸。',
      actionText: '记录第一次学习',
    }
  }

  if (todayRecordCount === 0) {
    return {
      currentStreak,
      todayMinutes,
      todayRecordCount,
      actionState: 'resume',
      actionTitle: '今天还没有记录学习',
      actionDescription: '为今天留一段学习记录，轨迹会继续向前延伸。',
      actionText: '记录一次学习',
    }
  }

  return {
    currentStreak,
    todayMinutes,
    todayRecordCount,
    actionState: 'recorded-today',
    actionTitle: '今天已经开始学习了',
    actionDescription: `已记录 ${todayRecordCount} 次，继续留下下一段学习轨迹。`,
    actionText: '再记录一次学习',
  }
}
