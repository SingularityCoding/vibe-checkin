import { parseLocalDate } from '../date/local-date'

export const ROUTES = {
  today: '/pages/today/index',
  log: '/pages/log/index',
  stats: '/pages/stats/index',
  recordEdit: '/pages/record-edit/index',
  recordDetail: '/pages/record-detail/index',
  settings: '/pages/settings/index',
} as const

export type MainTab = 'today' | 'log' | 'stats'
export type RecordListTab = 'today' | 'log'

export type LogFilterRouteInput = {
  date?: string
  tag?: string
}

const encodeRequired = (name: string, value: string): string => {
  if (value.trim().length === 0) {
    throw new Error(`${name} must not be empty`)
  }

  return encodeURIComponent(value)
}

export const getMainTabRoute = (tab: MainTab): string => ROUTES[tab]

export const buildCreateRecordRoute = (from: MainTab): string =>
  `${ROUTES.recordEdit}?mode=create&from=${from}`

export const buildRecordDetailRoute = (id: string, from: RecordListTab): string =>
  `${ROUTES.recordDetail}?id=${encodeRequired('Record id', id)}&from=${from}`

export const buildEditRecordRoute = (id: string, returnTo: RecordListTab): string =>
  `${ROUTES.recordEdit}?mode=edit&id=${encodeRequired('Record id', id)}&from=detail&returnTo=${returnTo}`

export const buildLogFilterRoute = ({ date, tag }: LogFilterRouteInput): string => {
  const query: string[] = []

  if (date !== undefined) {
    parseLocalDate(date)
    query.push(`date=${encodeURIComponent(date)}`)
  }

  if (tag !== undefined) {
    query.push(`tag=${encodeRequired('Tag', tag)}`)
  }

  return query.length === 0 ? ROUTES.log : `${ROUTES.log}?${query.join('&')}`
}
