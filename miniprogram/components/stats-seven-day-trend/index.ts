import type { SevenDayTrendItem } from '../../features/stats-seven-day-trend/index'

type TrendChartItem = SevenDayTrendItem & {
  barHeightPercent: number
  isPeak: boolean
}

Component({
  properties: {
    items: {
      type: Array,
      value: [] as SevenDayTrendItem[],
    },
  },
  observers: {
    items(this: WechatMiniprogram.Component.TrivialInstance & { data: { chartItems: TrendChartItem[] } }, items: SevenDayTrendItem[]) {
      if (!items || items.length === 0) {
        this.setData({ chartItems: [] })
        return
      }
      const maxMinutes = Math.max(...items.map(i => i.minutes))
      const chartItems: TrendChartItem[] = items.map(item => ({
        ...item,
        barHeightPercent: maxMinutes > 0 ? Math.round((item.minutes / maxMinutes) * 100) : 0,
        isPeak: maxMinutes > 0 && item.minutes === maxMinutes,
      }))
      this.setData({ chartItems })
    },
  },
  data: {
    chartItems: [] as TrendChartItem[],
  },
})
