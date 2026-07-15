import type { LearningRecord } from '../../domain/learning-record'

export type TagRankItem = {
  tag: string
  count: number
}

export const buildTagRank = (_records: readonly LearningRecord[]): TagRankItem[] => []
