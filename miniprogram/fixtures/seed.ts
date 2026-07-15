import { InMemoryRecordRepository } from '../repositories/in-memory-record/index'
import {
  configureRepositories,
  getLocalRepositories,
  useLocalRepositories,
} from '../repositories/composition'
import { SystemClock, type Clock } from '../shared/date/clock'
import { ROUTES } from '../shared/navigation/routes'
import {
  buildFixtureScenario,
  FIXTURE_SCENARIO_NAMES,
  isFixtureScenarioName,
  type FixtureScenarioName,
} from './scenarios'

export type FixtureSeedResult = {
  scenario: FixtureScenarioName | 'reset'
  recordCount: number
}

export type DevFixtureTools = {
  readonly scenarios: typeof FIXTURE_SCENARIO_NAMES
  seed(name: FixtureScenarioName): Promise<FixtureSeedResult>
  reset(): Promise<FixtureSeedResult>
  help(): string
}

export const applyLaunchFixture = async (
  value: unknown,
  clock: Clock = new SystemClock(),
): Promise<void> => {
  if (value === undefined || value === null || value === '') {
    return
  }

  const { envVersion } = wx.getAccountInfoSync().miniProgram

  if (envVersion !== 'develop') {
    return
  }

  if (value === 'reset') {
    await resetFixtureData()
    return
  }

  if (!isFixtureScenarioName(value)) {
    throw new Error(`Unknown launch fixture scenario: ${String(value)}`)
  }

  await seedFixtureScenario(value, clock)
}

const reloadTodayPage = (): void => {
  wx.reLaunch({ url: ROUTES.today })
}

export const seedFixtureScenario = async (
  name: FixtureScenarioName,
  clock: Clock = new SystemClock(),
): Promise<FixtureSeedResult> => {
  if (!isFixtureScenarioName(name)) {
    throw new Error(`Unknown fixture scenario: ${String(name)}`)
  }

  const scenario = buildFixtureScenario(name, clock)
  const local = getLocalRepositories()

  if (scenario.readError) {
    configureRepositories({
      record: new InMemoryRecordRepository([], {
        clock,
        readError: scenario.readError,
      }),
      preference: local.preference,
    })
  } else {
    useLocalRepositories()
    await local.record.replaceAll(scenario.records)
  }

  await local.preference.save(scenario.preference)

  return {
    scenario: name,
    recordCount: scenario.records.length,
  }
}

export const resetFixtureData = async (): Promise<FixtureSeedResult> => {
  const local = getLocalRepositories()
  useLocalRepositories()

  await Promise.all([local.record.reset(), local.preference.reset()])

  return {
    scenario: 'reset',
    recordCount: 0,
  }
}

export const createDevFixtureTools = (
  clock: Clock = new SystemClock(),
): DevFixtureTools => ({
  scenarios: FIXTURE_SCENARIO_NAMES,
  async seed(name) {
    const result = await seedFixtureScenario(name, clock)
    reloadTodayPage()
    return result
  },
  async reset() {
    const result = await resetFixtureData()
    reloadTodayPage()
    return result
  },
  help() {
    return [
      "切换场景：await getApp().devFixtures.seed('empty' | 'today' | 'history' | 'read-error')",
      '恢复干净的本地数据：await getApp().devFixtures.reset()',
    ].join('\n')
  },
})
