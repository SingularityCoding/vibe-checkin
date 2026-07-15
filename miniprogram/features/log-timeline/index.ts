import type { LearningRecord } from '../../domain/learning-record'

export type LogTimelineSummary = {
  checkInDays: number
  recordCount: number
  totalMinutes: number
}

export type LogTimelineRecord = {
  id: string
  time: string
  duration: number
  content: string
  tags: string[]
}

export type LogTimelineGroup = {
  date: string
  dateLabel: string
  totalMinutes: number
  records: LogTimelineRecord[]
}

export type LogTimelineViewModel = {
  summary: LogTimelineSummary
  groups: LogTimelineGroup[]
}

export const buildLogTimeline = (_records: readonly LearningRecord[]): LogTimelineViewModel => ({
  summary: {
    checkInDays: 0,
    recordCount: 0,
    totalMinutes: 0,
  },
  groups: [],
})
