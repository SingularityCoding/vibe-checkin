import type { LearningRecord, RecordInput } from '../domain/learning-record'
import type { SyncInfo } from '../domain/sync-info'

export interface RecordRepository {
  list(): Promise<LearningRecord[]>
  get(id: string): Promise<LearningRecord | null>
  create(input: RecordInput): Promise<LearningRecord>
  update(id: string, input: RecordInput): Promise<LearningRecord>
  remove(id: string): Promise<void>
  removeAllMine(): Promise<void>
  reloadFromCloud(): Promise<LearningRecord[]>
  getSyncInfo(): Promise<SyncInfo>
}
