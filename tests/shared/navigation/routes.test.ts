import { describe, expect, it } from 'vitest'

import {
  ROUTES,
  buildCreateRecordRoute,
  buildEditRecordRoute,
  buildLogFilterRoute,
  buildRecordDetailRoute,
  getMainTabRoute,
} from '../../../miniprogram/shared/navigation/routes'

describe('navigation routes', () => {
  it('returns registered main tab and create routes', () => {
    expect(getMainTabRoute('today')).toBe(ROUTES.today)
    expect(buildCreateRecordRoute('stats')).toBe('/pages/record-edit/index?mode=create&from=stats')
  })

  it('encodes record ids and preserves the original return tab', () => {
    expect(buildRecordDetailRoute('record/a b', 'log')).toBe(
      '/pages/record-detail/index?id=record%2Fa%20b&from=log',
    )
    expect(buildEditRecordRoute('record/a b', 'today')).toBe(
      '/pages/record-edit/index?mode=edit&id=record%2Fa%20b&from=detail&returnTo=today',
    )
  })

  it('builds an encoded log filter route in a stable order', () => {
    expect(buildLogFilterRoute({ date: '2026-07-15', tag: 'Agent & MCP' })).toBe(
      '/pages/log/index?date=2026-07-15&tag=Agent%20%26%20MCP',
    )
    expect(buildLogFilterRoute({})).toBe(ROUTES.log)
  })

  it('rejects invalid route values', () => {
    expect(() => buildRecordDetailRoute('  ', 'log')).toThrow('Record id must not be empty')
    expect(() => buildLogFilterRoute({ date: '2026-02-30' })).toThrow('Invalid local date')
    expect(() => buildLogFilterRoute({ tag: '' })).toThrow('Tag must not be empty')
  })
})
