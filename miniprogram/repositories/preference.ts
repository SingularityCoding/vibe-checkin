import type { LearningPreference } from '../domain/learning-preference'
import type { PreferenceRepository } from './preference-repository'

class StarterPreferenceRepository implements PreferenceRepository {
  async get(): Promise<LearningPreference> {
    return { defaultDuration: 30 }
  }

  async save(input: LearningPreference): Promise<LearningPreference> {
    return input
  }
}

export const preferenceRepository: PreferenceRepository = new StarterPreferenceRepository()
