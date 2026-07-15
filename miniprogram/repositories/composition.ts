import { LocalPreferenceRepository } from './local-preference/index'
import { LocalRecordRepository } from './local-record/index'
import type { PreferenceRepository } from './preference-repository'
import type { RecordRepository } from './record-repository'

export type RepositoryComposition = {
  record: RecordRepository
  preference: PreferenceRepository
}

const localRepositories = {
  record: new LocalRecordRepository(),
  preference: new LocalPreferenceRepository(),
}

let activeRepositories: RepositoryComposition = { ...localRepositories }

export const getRepositories = (): RepositoryComposition => ({
  ...activeRepositories,
})

export const configureRepositories = (
  overrides: Partial<RepositoryComposition>,
): RepositoryComposition => {
  activeRepositories = {
    ...activeRepositories,
    ...overrides,
  }

  return getRepositories()
}

export const useLocalRepositories = (): RepositoryComposition => {
  activeRepositories = { ...localRepositories }
  return getRepositories()
}

export const getLocalRepositories = (): {
  record: LocalRecordRepository
  preference: LocalPreferenceRepository
} => localRepositories
