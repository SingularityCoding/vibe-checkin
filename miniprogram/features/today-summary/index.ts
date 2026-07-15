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

const FIRST_TIME_ACTION = {
  actionState: 'first-time',
  actionTitle: '今天还没有开始学习',
  actionDescription: '记录一段学习，轨迹会从今天开始延伸。',
  actionText: '记录第一次学习',
} as const

const RESUME_ACTION = {
  actionState: 'resume',
  actionTitle: '今天还没有开始学习',
  actionDescription: '',
  actionText: '记录一次学习',
} as const

const buildRecordedTodayAction = (todayRecordCount: number) =>
  ({
    actionState: 'recorded-today',
    actionTitle: '今天已经开始学习了',
    actionDescription: `已记录 ${todayRecordCount} 次，继续留下下一段学习轨迹。`,
    actionText: '再记录一次学习',
  }) as const

export const buildTodaySummary = (
  records: readonly LearningRecord[],
  clock: Clock,
): TodaySummaryViewModel => {
  const today = clock.today()
  const todayRecords = records.filter((record) => record.date === today)
  const todayMinutes = todayRecords.reduce((total, record) => total + record.duration, 0)
  const todayRecordCount = todayRecords.length
  const action =
    records.length === 0
      ? FIRST_TIME_ACTION
      : todayRecordCount > 0
        ? buildRecordedTodayAction(todayRecordCount)
        : RESUME_ACTION

  return {
    currentStreak: calculateStreakSummary(records, clock).current,
    todayMinutes,
    todayRecordCount,
    ...action,
  }
}
