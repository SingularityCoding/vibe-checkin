import { describe, expect, it } from 'vitest'

import { CloudRecordRepository } from '../../miniprogram/repositories/cloud-record/index'

describe('CloudRecordRepository (P0 safe skeleton)', () => {
  it('rejects every method instead of silently succeeding', async () => {
    const repository = new CloudRecordRepository()

    await expect(repository.list()).rejects.toThrow('not implemented')
    await expect(repository.get('any')).rejects.toThrow('not implemented')
    await expect(
      repository.create({ content: '内容', duration: 30, tags: [] }),
    ).rejects.toThrow('not implemented')
    await expect(
      repository.update('any', { content: '内容', duration: 30, tags: [] }),
    ).rejects.toThrow('not implemented')
    await expect(repository.remove('any')).rejects.toThrow('not implemented')
    await expect(repository.removeAllMine()).rejects.toThrow('not implemented')
    await expect(repository.reloadFromCloud()).rejects.toThrow('not implemented')
    await expect(repository.getSyncInfo()).rejects.toThrow('not implemented')
  })
})
