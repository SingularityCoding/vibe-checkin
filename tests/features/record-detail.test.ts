import { describe, expect, it } from 'vitest'

import type { LearningRecord } from '../../miniprogram/domain/learning-record'
import { buildRecordDetail } from '../../miniprogram/features/record-detail/index'

const baseRecord: LearningRecord = {
  id: 'record-1',
  date: '2026-07-15',
  createdAt: new Date(2026, 6, 15, 9, 5).getTime(),
  updatedAt: new Date(2026, 6, 15, 9, 10).getTime(),
  content: '上午学习了 TypeScript 泛型\n下午练习了组件测试',
  duration: 45,
  tags: ['TypeScript', '组件测试'],
  takeaway: '写测试前先想清楚输入输出。',
}

describe('buildRecordDetail', () => {
  it('formats the local date, weekday, creation time and duration from record fields', () => {
    const view = buildRecordDetail(baseRecord)

    expect(view.dateLabel).toBe('2026年7月15日')
    expect(view.weekdayLabel).toBe('星期三')
    expect(view.timeLabel).toBe('09:05')
    expect(view.durationLabel).toBe('45 分钟')
  })

  it('derives the date and weekday from record.date, not from createdAt', () => {
    // date and createdAt intentionally land on different calendar days here; the
    // starter kit contract requires date/weekday grouping to use `record.date` and
    // reserve `createdAt` for the creation-time-of-day display only.
    const record: LearningRecord = {
      ...baseRecord,
      date: '2026-07-16',
      createdAt: new Date(2026, 6, 15, 23, 50).getTime(),
    }

    const view = buildRecordDetail(record)

    expect(view.dateLabel).toBe('2026年7月16日')
    expect(view.weekdayLabel).toBe('星期四')
    expect(view.timeLabel).toBe('23:50')
  })

  it('preserves multi-line content exactly, including blank lines', () => {
    const record: LearningRecord = {
      ...baseRecord,
      content: '第一行内容\n\n第三行内容，中间有空行',
    }

    const view = buildRecordDetail(record)

    expect(view.content).toBe('第一行内容\n\n第三行内容，中间有空行')
  })

  it('maps tags and takeaway onto the view model when present', () => {
    const view = buildRecordDetail(baseRecord)

    expect(view.tags).toEqual(['TypeScript', '组件测试'])
    expect(view.takeaway).toBe('写测试前先想清楚输入输出。')
  })

  it('omits tags and takeaway when the record has neither, so no empty section renders', () => {
    const record: LearningRecord = { ...baseRecord, tags: [], takeaway: undefined }

    const view = buildRecordDetail(record)

    expect(view.tags).toEqual([])
    expect(view.takeaway).toBeUndefined()
  })

  it('treats a whitespace-only takeaway the same as an absent one', () => {
    const record: LearningRecord = { ...baseRecord, takeaway: '   ' }

    const view = buildRecordDetail(record)

    expect(view.takeaway).toBeUndefined()
  })

  it('returns a defensive copy of tags so mutating the view model cannot affect the record', () => {
    const view = buildRecordDetail(baseRecord)
    view.tags.push('额外标签')

    expect(baseRecord.tags).toEqual(['TypeScript', '组件测试'])
  })
})
