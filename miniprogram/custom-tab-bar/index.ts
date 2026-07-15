const tabRoutes = {
  today: '/pages/today/index',
  log: '/pages/log/index',
  stats: '/pages/stats/index',
} as const

type TabKey = keyof typeof tabRoutes

type TabBarChangeEvent = {
  detail: {
    value: string | number
  }
}

const isTabKey = (value: string | number): value is TabKey => typeof value === 'string' && value in tabRoutes

Component({
  data: {
    selected: 'today' as TabKey,
  },
  pageLifetimes: {
    show() {
      this.syncSelectedWithRoute()
    },
  },
  methods: {
    init() {
      this.syncSelectedWithRoute()
    },
    syncSelectedWithRoute() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const route = currentPage?.route
      const selected = Object.entries(tabRoutes).find(([, path]) => path.slice(1) === route)?.[0]

      if (selected && isTabKey(selected)) {
        this.setData({ selected })
      }
    },
    onChange(event: TabBarChangeEvent) {
      const selected = event.detail.value

      if (!isTabKey(selected)) {
        return
      }

      this.setData({ selected })
      wx.switchTab({ url: tabRoutes[selected] })
    },
  },
})
