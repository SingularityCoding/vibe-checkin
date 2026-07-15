import type { LearningPreference } from '../domain/learning-preference'

export interface PreferenceRepository {
  get(): Promise<LearningPreference>
  save(input: LearningPreference): Promise<LearningPreference>
}
