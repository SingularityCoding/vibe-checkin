import {
  RECORD_TAG_MAX_COUNT,
  RECORD_TAG_MAX_LENGTH,
} from '../../domain/constraints'
import type { LearningRecord } from '../../domain/learning-record'

const isValidTag = (tag: string): boolean => tag.length >= 1 && tag.length <= RECORD_TAG_MAX_LENGTH

/**
 * Collects candidate topics a user can pick from while creating or editing a
 * record, sourced from their own history. Tags are trimmed, deduped and kept
 * in most-recently-used order so the topic someone just used shows up first.
 * Invalid leftovers (empty or over the max length) are dropped defensively —
 * Repository-level constraints should already prevent them from existing.
 */
export const collectSuggestedTags = (records: readonly LearningRecord[]): string[] => {
  const sorted = [...records].sort((a, b) => b.createdAt - a.createdAt)
  const seen = new Set<string>()
  const suggestions: string[] = []

  for (const record of sorted) {
    for (const rawTag of record.tags) {
      const tag = rawTag.trim()

      if (!isValidTag(tag) || seen.has(tag)) {
        continue
      }

      seen.add(tag)
      suggestions.push(tag)
    }
  }

  return suggestions
}

/**
 * Produces the tags a record draft may actually be saved with: trimmed,
 * de-duplicated, filtered to the 1–12 character rule and capped at
 * RECORD_TAG_MAX_COUNT. Order of the first valid occurrence is preserved so
 * the component can pass through whatever selection order the user built.
 */
export const normalizeSelectedTags = (tags: readonly string[]): string[] => {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const rawTag of tags) {
    const tag = rawTag.trim()

    if (!isValidTag(tag) || seen.has(tag)) {
      continue
    }

    seen.add(tag)
    normalized.push(tag)

    if (normalized.length === RECORD_TAG_MAX_COUNT) {
      break
    }
  }

  return normalized
}
