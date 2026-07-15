import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../miniprogram/domain/learning-record'
import { CLOUD_RECORD_SCHEMA_VERSION } from '../../miniprogram/config/cloud'
import {
  mapCloudDocumentToLearningRecord,
  mapLearningRecordToCloudData,
} from '../../miniprogram/repositories/cloud-record/document'

const record: LearningRecord = {
  id: 'cloud-record-001',
  date: '2026-07-15',
  createdAt: 1000,
  updatedAt: 2000,
  content: '定义 CloudBase DTO 映射',
  duration: 40,
  tags: ['CloudBase', 'TDD'],
  takeaway: '存储字段不能直接泄漏到页面领域模型。',
}

describe('Cloud learning record document mapping', () => {
  it('maps a cloud document without exposing _openid to the domain', () => {
    const mapped = mapCloudDocumentToLearningRecord({
      _id: record.id,
      _openid: 'fixture-owner',
      schemaVersion: CLOUD_RECORD_SCHEMA_VERSION,
      date: record.date,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      content: record.content,
      duration: record.duration,
      tags: [...record.tags],
      takeaway: record.takeaway,
    })

    expect(mapped).toEqual(record)
    expect(mapped).not.toHaveProperty('_openid')
  })

  it('stores a normalized takeaway and defensive tag copy', () => {
    const withoutTakeaway: LearningRecord = {
      ...record,
      tags: ['CloudBase'],
      takeaway: undefined,
    }
    const data = mapLearningRecordToCloudData(withoutTakeaway)
    withoutTakeaway.tags.push('external mutation')

    expect(data).toEqual({
      schemaVersion: CLOUD_RECORD_SCHEMA_VERSION,
      date: record.date,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      content: record.content,
      duration: record.duration,
      tags: ['CloudBase'],
      takeaway: '',
    })
  })

  it('rejects unsupported schema versions and invalid record data', () => {
    expect(() =>
      mapCloudDocumentToLearningRecord({
        _id: record.id,
        _openid: 'fixture-owner',
        schemaVersion: 2,
        date: record.date,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        content: record.content,
        duration: record.duration,
        tags: record.tags,
        takeaway: record.takeaway,
      }),
    ).toThrow('unsupported shape')

    expect(() =>
      mapLearningRecordToCloudData({ ...record, duration: 0 }),
    ).toThrow('invalid learning record')
  })
})
