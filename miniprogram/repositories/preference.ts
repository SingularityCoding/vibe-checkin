import type { LearningPreference } from '../domain/learning-preference'
import { getRepositories } from './composition'
import type { PreferenceRepository } from './preference-repository'

class ComposedPreferenceRepository implements PreferenceRepository {
  get(): Promise<LearningPreference> {
    return getRepositories().preference.get()
  }

  save(input: LearningPreference): Promise<LearningPreference> {
    return getRepositories().preference.save(input)
  }
}

export const preferenceRepository: PreferenceRepository = new ComposedPreferenceRepository()
