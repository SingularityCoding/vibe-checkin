import {
  RECORD_TAG_MAX_COUNT,
  RECORD_TAG_MAX_LENGTH,
} from '../../domain/constraints'
import type { LearningRecord } from '../../domain/learning-record'

const normalizeTag = (tag: string): string => tag.trim()

const isValidTag = (tag: string): boolean =>
  tag.length > 0 && tag.length <= RECORD_TAG_MAX_LENGTH

export const collectSuggestedTags = (
  records: readonly LearningRecord[],
): string[] => {
  const result: string[] = []
  const seen = new Set<string>()

  const sortedRecords = [...records].sort(
    (a, b) => b.createdAt - a.createdAt,
  )

  for (const record of sortedRecords) {
    for (const rawTag of record.tags) {
      const tag = normalizeTag(rawTag)

      if (!isValidTag(tag) || seen.has(tag)) {
        continue
      }

      seen.add(tag)
      result.push(tag)
    }
  }

  return result
}

export const normalizeSelectedTags = (
  tags: readonly string[],
): string[] => {
  const result: string[] = []
  const seen = new Set<string>()

  for (const rawTag of tags) {
    const tag = normalizeTag(rawTag)

    if (!isValidTag(tag) || seen.has(tag)) {
      continue
    }

    seen.add(tag)
    result.push(tag)

    if (result.length >= RECORD_TAG_MAX_COUNT) {
      break
    }
  }

  return result
}