import { describe, expect, it } from 'vitest'
import type { LearningRecord } from '../../miniprogram/domain/learning-record'
import { buildRecordDetail } from '../../miniprogram/features/record-detail/index'

const baseRecord: LearningRecord = {
  id: 'test-record-1',
  date: '2026-07-15',
  createdAt: new Date(2026, 6, 15, 9, 5).getTime(),
  updatedAt: new Date(2026, 6, 15, 9, 10).getTime(),
  content: '梳理 TypeScript 类型和小程序页面之间的数据流',
  duration: 45,
  tags: ['TypeScript', '组件测试'],
  takeaway: '写测试前先想清楚输入输出。',
}

describe('buildRecordDetail', () => {
  // AC-001
  it('formats date, weekday, time, and duration correctly', () => {
    const result = buildRecordDetail(baseRecord)

    expect(result.id).toBe('test-record-1')
    expect(result.dateLabel).toBe('2026年7月15日')
    expect(result.weekdayLabel).toBe('星期三')
    expect(result.timeLabel).toBe('09:05')
    expect(result.durationLabel).toBe('45 分钟')
  })

  // AC-002
  it('derives date and weekday from record.date, not from createdAt', () => {
    const record: LearningRecord = {
      ...baseRecord,
      date: '2026-07-16',
      createdAt: new Date(2026, 6, 15, 23, 50).getTime(),
    }

    const result = buildRecordDetail(record)

    // dateLabel and weekdayLabel come from record.date (2026-07-16, a Thursday)
    expect(result.dateLabel).toBe('2026年7月16日')
    expect(result.weekdayLabel).toBe('星期四')
    // timeLabel comes from createdAt (23:50)
    expect(result.timeLabel).toBe('23:50')
  })

  // AC-003
  it('preserves newlines and blank lines in content', () => {
    const originalContent = '第一行内容\n\n第三行内容，中间有空行'
    const record: LearningRecord = {
      ...baseRecord,
      content: originalContent,
    }

    const result = buildRecordDetail(record)

    expect(result.content).toBe(originalContent)
    expect(result.content).toContain('\n\n')
  })

  // AC-004
  it('maps tags and takeaway correctly when both are present', () => {
    const result = buildRecordDetail(baseRecord)

    expect(result.tags).toEqual(['TypeScript', '组件测试'])
    expect(result.takeaway).toBe('写测试前先想清楚输入输出。')
  })

  // AC-005
  it('handles empty tags and undefined takeaway', () => {
    const record: LearningRecord = {
      ...baseRecord,
      tags: [],
      takeaway: undefined,
    }

    const result = buildRecordDetail(record)

    expect(result.tags).toEqual([])
    expect(result.takeaway).toBeUndefined()
  })

  // AC-006
  it('treats whitespace-only takeaway as undefined', () => {
    const record: LearningRecord = {
      ...baseRecord,
      takeaway: '   ',
    }

    const result = buildRecordDetail(record)

    expect(result.takeaway).toBeUndefined()
  })

  // AC-007
  it('returns a defensive copy of tags, not the original array', () => {
    const result = buildRecordDetail(baseRecord)

    result.tags.push('额外标签')

    // Original record must not be mutated
    expect(baseRecord.tags).toEqual(['TypeScript', '组件测试'])
    // The returned array has the extra tag (proving it's a separate copy)
    expect(result.tags).toEqual(['TypeScript', '组件测试', '额外标签'])
  })
})
