import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from '../../shared/date/clock'

export type SevenDayTrendItem = {
  date: string
  label: string
  minutes: number
}

export const buildSevenDayTrend = (
  _records: readonly LearningRecord[],
  _clock: Clock,
): SevenDayTrendItem[] => []
