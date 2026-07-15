import { beforeAll, describe, expect, it, vi } from 'vitest'

type StatsCalendarDefinition = {
  methods: {
    onSelectDate(
      this: { triggerEvent: (name: string, detail: { date: string }) => void },
      event: { currentTarget: { dataset: { date?: string } } },
    ): void
  }
}

let definition: StatsCalendarDefinition

beforeAll(async () => {
  vi.stubGlobal('Component', (value: StatsCalendarDefinition) => {
    definition = value
  })

  // The WeChat component script intentionally has no exports, but importing it
  // executes its Component registration for this focused behavior test.
  // @ts-expect-error The component script is not an ES module.
  await import('../../miniprogram/components/stats-calendar/index')
})

describe('stats-calendar component', () => {
  it('emits the selected real date for the page openLogByDate handler', () => {
    const triggerEvent = vi.fn()

    definition.methods.onSelectDate.call(
      { triggerEvent },
      { currentTarget: { dataset: { date: '2026-06-30' } } },
    )

    expect(triggerEvent).toHaveBeenCalledOnce()
    expect(triggerEvent).toHaveBeenCalledWith('select-date', {
      date: '2026-06-30',
    })
  })

  it('does not emit when the tapped cell has no date', () => {
    const triggerEvent = vi.fn()

    definition.methods.onSelectDate.call(
      { triggerEvent },
      { currentTarget: { dataset: {} } },
    )

    expect(triggerEvent).not.toHaveBeenCalled()
  })
})
