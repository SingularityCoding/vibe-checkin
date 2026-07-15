import type { TodaySummaryViewModel } from '../../features/today-summary/index'

const emptyModel: TodaySummaryViewModel = {
  currentStreak: 0,
  todayMinutes: 0,
  todayRecordCount: 0,
  actionTitle: '',
  actionDescription: '',
  actionText: '',
}

Component({
  properties: {
    model: {
      type: Object,
      value: emptyModel,
    },
  },
  methods: {
    onCreateRecord() {
      this.triggerEvent('create-record')
    },
  },
})
