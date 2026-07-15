import type { LearningRecord } from '../../domain/learning-record'

export type TagRankItem = {
  tag: string
  count: number
}

export const buildTagRank = (records: readonly LearningRecord[]): TagRankItem[] => {
  const map = new Map<string, { count: number; lastUsedAt: number }>()

  for (const record of records) {
    const uniqueTags = new Set(record.tags)

    for (const tag of uniqueTags) {
      const entry = map.get(tag)

      if (entry) {
        entry.count++
        entry.lastUsedAt = Math.max(entry.lastUsedAt, record.createdAt)
      } else {
        map.set(tag, { count: 1, lastUsedAt: record.createdAt })
      }
    }
  }

  const sorted = Array.from(map.entries())
    .sort(([, a], [, b]) => {
      if (b.count !== a.count) return b.count - a.count
      return b.lastUsedAt - a.lastUsedAt
    })
    .slice(0, 3)
    .map(([tag, { count }]) => ({ tag, count }))

  return sorted
}
