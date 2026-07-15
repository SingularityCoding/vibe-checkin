import type { LearningRecord, RecordInput } from '../domain/learning-record'
import type { SyncInfo } from '../domain/sync-info'
import type { RecordRepository } from './record-repository'

class StarterRecordRepository implements RecordRepository {
  async list(): Promise<LearningRecord[]> {
    return []
  }

  async get(_id: string): Promise<LearningRecord | null> {
    return null
  }

  async create(_input: RecordInput): Promise<LearningRecord> {
    throw new Error('Record creation is not available in the starter adapter')
  }

  async update(_id: string, _input: RecordInput): Promise<LearningRecord> {
    throw new Error('Record updates are not available in the starter adapter')
  }

  async remove(_id: string): Promise<void> {
    throw new Error('Record deletion is not available in the starter adapter')
  }

  async removeAllMine(): Promise<void> {
    throw new Error('Bulk record deletion is not available in the starter adapter')
  }

  async reloadFromCloud(): Promise<LearningRecord[]> {
    return []
  }

  async getSyncInfo(): Promise<SyncInfo> {
    return {
      state: 'idle',
      message: 'Starter Kit 使用本地开发数据',
    }
  }
}

export const recordRepository: RecordRepository = new StarterRecordRepository()
