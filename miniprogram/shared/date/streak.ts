import type { LearningRecord } from '../../domain/learning-record'
import type { Clock } from './clock'
import { addLocalDays, compareLocalDates, parseLocalDate } from './local-date'

export type StreakSummary = {
  current: number
  longest: number
}

const uniqueSortedDates = (records: ReadonlyArray<Pick<LearningRecord, 'date'>>): string[] => {
  const dates = new Set(
    records.map(({ date }) => {
      parseLocalDate(date)
      return date
    }),
  )

  return Array.from(dates).sort(compareLocalDates)
}

const calculateCurrentStreak = (dates: ReadonlySet<string>, today: string): number => {
  const start = dates.has(today) ? today : addLocalDays(today, -1)

  if (!dates.has(start)) {
    return 0
  }

  let current = 0
  let cursor = start

  while (dates.has(cursor)) {
    current += 1
    cursor = addLocalDays(cursor, -1)
  }

  return current
}

const calculateLongestStreak = (sortedDates: readonly string[]): number => {
  let longest = 0
  let running = 0
  let previous: string | undefined

  sortedDates.forEach((date) => {
    running = previous !== undefined && addLocalDays(previous, 1) === date ? running + 1 : 1
    longest = Math.max(longest, running)
    previous = date
  })

  return longest
}

export const calculateStreakSummary = (
  records: ReadonlyArray<Pick<LearningRecord, 'date'>>,
  clock: Clock,
): StreakSummary => {
  const sortedDates = uniqueSortedDates(records)
  const dates = new Set(sortedDates)

  return {
    current: calculateCurrentStreak(dates, clock.today()),
    longest: calculateLongestStreak(sortedDates),
  }
}
