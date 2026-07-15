import type { LearningRecord, RecordInput } from '../../domain/learning-record'
import type { SyncInfo } from '../../domain/sync-info'
import type { RecordRepository } from '../record-repository'

const notImplemented = (method: string): Error =>
  new Error(
    `CloudRecordRepository.${method} is not implemented yet. This is the P1-08 deliverable.`,
  )

// Safe placeholder for P1-08: every method rejects instead of silently
// succeeding, so accidentally activating this repository before P1-08 is
// done fails honestly rather than reporting fake success or empty data.
export class CloudRecordRepository implements RecordRepository {
  list(): Promise<LearningRecord[]> {
    return Promise.reject(notImplemented('list'))
  }

  get(_id: string): Promise<LearningRecord | null> {
    return Promise.reject(notImplemented('get'))
  }

  create(_input: RecordInput): Promise<LearningRecord> {
    return Promise.reject(notImplemented('create'))
  }

  update(_id: string, _input: RecordInput): Promise<LearningRecord> {
    return Promise.reject(notImplemented('update'))
  }

  remove(_id: string): Promise<void> {
    return Promise.reject(notImplemented('remove'))
  }

  removeAllMine(): Promise<void> {
    return Promise.reject(notImplemented('removeAllMine'))
  }

  reloadFromCloud(): Promise<LearningRecord[]> {
    return Promise.reject(notImplemented('reloadFromCloud'))
  }

  getSyncInfo(): Promise<SyncInfo> {
    return Promise.reject(notImplemented('getSyncInfo'))
  }
}
