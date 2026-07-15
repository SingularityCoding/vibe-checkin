import type { LearningRecord, RecordInput } from '../domain/learning-record'
import type { SyncInfo } from '../domain/sync-info'
import { getRepositories } from './composition'
import type { RecordRepository } from './record-repository'

class ComposedRecordRepository implements RecordRepository {
  list(): Promise<LearningRecord[]> {
    return getRepositories().record.list()
  }

  get(id: string): Promise<LearningRecord | null> {
    return getRepositories().record.get(id)
  }

  create(input: RecordInput): Promise<LearningRecord> {
    return getRepositories().record.create(input)
  }

  update(id: string, input: RecordInput): Promise<LearningRecord> {
    return getRepositories().record.update(id, input)
  }

  remove(id: string): Promise<void> {
    return getRepositories().record.remove(id)
  }

  removeAllMine(): Promise<void> {
    return getRepositories().record.removeAllMine()
  }

  reloadFromCloud(): Promise<LearningRecord[]> {
    return getRepositories().record.reloadFromCloud()
  }

  getSyncInfo(): Promise<SyncInfo> {
    return getRepositories().record.getSyncInfo()
  }
}

export const recordRepository: RecordRepository = new ComposedRecordRepository()
