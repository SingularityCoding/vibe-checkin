import {
  RECORD_DURATION_MAX,
  RECORD_DURATION_MIN,
  RECORD_DURATION_STEP,
} from '../../domain/constraints'
import type { LearningPreference } from '../../domain/learning-preference'
import type { PreferenceRepository } from '../preference-repository'
import { WxStorage, type KeyValueStorage } from '../storage'

export const LOCAL_PREFERENCE_STORAGE_KEY = 'vibe-checkin.preference.v1'
export const DEFAULT_LEARNING_PREFERENCE: LearningPreference = {
  defaultDuration: 30,
}

type StoredPreference = {
  version: 1
  preference: LearningPreference
}

export type LocalPreferenceRepositoryOptions = {
  storage?: KeyValueStorage
  storageKey?: string
}

const isLearningPreference = (value: unknown): value is LearningPreference => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<LearningPreference>

  return (
    typeof candidate.defaultDuration === 'number' &&
    Number.isInteger(candidate.defaultDuration) &&
    candidate.defaultDuration >= RECORD_DURATION_MIN &&
    candidate.defaultDuration <= RECORD_DURATION_MAX &&
    candidate.defaultDuration % RECORD_DURATION_STEP === 0
  )
}

const isStoredPreference = (value: unknown): value is StoredPreference => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<StoredPreference>

  return candidate.version === 1 && isLearningPreference(candidate.preference)
}

export class LocalPreferenceRepository implements PreferenceRepository {
  private readonly storage: KeyValueStorage
  private readonly storageKey: string

  constructor(options: LocalPreferenceRepositoryOptions = {}) {
    this.storage = options.storage ?? new WxStorage()
    this.storageKey = options.storageKey ?? LOCAL_PREFERENCE_STORAGE_KEY
  }

  async get(): Promise<LearningPreference> {
    const stored = this.storage.get(this.storageKey)

    if (stored === undefined || stored === null || stored === '') {
      return { ...DEFAULT_LEARNING_PREFERENCE }
    }

    if (!isStoredPreference(stored)) {
      throw new Error('Local learning preference is unreadable or uses an unsupported version')
    }

    return { ...stored.preference }
  }

  async save(input: LearningPreference): Promise<LearningPreference> {
    if (!isLearningPreference(input)) {
      throw new Error(
        `Default learning duration must be a positive integer between ${RECORD_DURATION_MIN} and ${RECORD_DURATION_MAX} in steps of ${RECORD_DURATION_STEP}`,
      )
    }

    const preference = { ...input }
    this.storage.set(this.storageKey, {
      version: 1,
      preference,
    } satisfies StoredPreference)

    return { ...preference }
  }

  async reset(): Promise<void> {
    this.storage.remove(this.storageKey)
  }
}
