import type { LearningPreference } from '../domain/learning-preference'
import type { LearningRecord } from '../domain/learning-record'
import type { Clock } from '../shared/date/clock'
import { addLocalDays, parseLocalDate } from '../shared/date/local-date'

export const FIXTURE_SCENARIO_NAMES = [
  'empty',
  'today',
  'history',
  'read-error',
] as const

export type FixtureScenarioName = (typeof FIXTURE_SCENARIO_NAMES)[number]

export const isFixtureScenarioName = (value: unknown): value is FixtureScenarioName =>
  FIXTURE_SCENARIO_NAMES.some((name) => name === value)

export type FixtureScenario = {
  name: FixtureScenarioName
  records: LearningRecord[]
  preference: LearningPreference
  readError?: Error
}

const DEFAULT_FIXTURE_PREFERENCE: LearningPreference = {
  defaultDuration: 30,
}

const timestampOn = (date: string, hour: number, minute: number): number => {
  const value = parseLocalDate(date)
  value.setHours(hour, minute, 0, 0)
  return value.getTime()
}

const record = (
  id: string,
  date: string,
  hour: number,
  minute: number,
  content: string,
  duration: number,
  tags: string[],
  takeaway?: string,
): LearningRecord => {
  const createdAt = timestampOn(date, hour, minute)

  return {
    id,
    date,
    createdAt,
    updatedAt: createdAt + 5 * 60 * 1000,
    content,
    duration,
    tags: [...tags],
    ...(takeaway === undefined ? {} : { takeaway }),
  }
}

const buildTodayRecords = (clock: Clock): LearningRecord[] => {
  const today = clock.today()

  return [
    record(
      'fixture-today-typescript',
      today,
      9,
      10,
      '梳理 TypeScript 类型和小程序页面之间的数据流',
      35,
      ['TypeScript', '小程序'],
      '先把输入输出类型写清楚，页面接线会轻松很多。',
    ),
    record(
      'fixture-today-review',
      today,
      14,
      20,
      'Review 同学提交的学习日志组件',
      25,
      ['Code Review'],
    ),
  ]
}

const buildHistoryRecords = (clock: Clock): LearningRecord[] => {
  const today = clock.today()
  const yesterday = addLocalDays(today, -1)
  const twoDaysAgo = addLocalDays(today, -2)
  const threeDaysAgo = addLocalDays(today, -3)
  const fiveDaysAgo = addLocalDays(today, -5)
  const twelveDaysAgo = addLocalDays(today, -12)
  const previousMonth = addLocalDays(today, -32)

  return [
    record(
      'fixture-history-today-morning',
      today,
      8,
      40,
      '为 Repository 契约补充测试用例',
      40,
      ['TDD', 'TypeScript'],
      '先写失败用例能更快发现接口边界。',
    ),
    record(
      'fixture-history-today-afternoon',
      today,
      15,
      5,
      '练习在开发者工具中定位页面状态',
      20,
      ['小程序', '调试'],
    ),
    record(
      'fixture-history-yesterday',
      yesterday,
      19,
      15,
      '完成学习日志页面的组件拆分',
      50,
      ['小程序', 'UI'],
      '组件只接收数据并抛出事件，测试会更简单。',
    ),
    record(
      'fixture-history-two-days',
      twoDaysAgo,
      18,
      30,
      '阅读 Specs-driven development 示例',
      30,
      ['Specs', 'AI 协作'],
    ),
    record(
      'fixture-history-three-days',
      threeDaysAgo,
      20,
      0,
      '整理 Git 分支和 Pull Request 流程',
      45,
      ['Git', 'Code Review'],
      '小步提交让 review 更容易聚焦。',
    ),
    record(
      'fixture-history-gap',
      fiveDaysAgo,
      10,
      25,
      '复习本地日期计算',
      25,
      ['TypeScript', '日期'],
    ),
    record(
      'fixture-history-older',
      twelveDaysAgo,
      16,
      10,
      '第一次运行微信小程序 TS 模板',
      35,
      ['小程序'],
    ),
    record(
      'fixture-history-previous-month',
      previousMonth,
      11,
      0,
      '记录课程项目最初的产品想法',
      60,
      ['产品设计', 'Specs'],
      '先确定用户真正需要看到的结果。',
    ),
  ]
}

export const buildFixtureScenario = (
  name: FixtureScenarioName,
  clock: Clock,
): FixtureScenario => {
  const preference = { ...DEFAULT_FIXTURE_PREFERENCE }

  switch (name) {
    case 'empty':
      return { name, records: [], preference }
    case 'today':
      return { name, records: buildTodayRecords(clock), preference }
    case 'history':
      return { name, records: buildHistoryRecords(clock), preference }
    case 'read-error':
      return {
        name,
        records: [],
        preference,
        readError: new Error('Fixture simulated a record read failure'),
      }
  }
}
