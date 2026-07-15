import { formatLocalDate } from './local-date'

export interface Clock {
  now(): Date
  today(): string
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }

  today(): string {
    return formatLocalDate(this.now())
  }
}

export class FixedClock implements Clock {
  private readonly fixedTime: number

  constructor(date: Date) {
    if (Number.isNaN(date.getTime())) {
      throw new Error('FixedClock requires a valid date')
    }

    this.fixedTime = date.getTime()
  }

  now(): Date {
    return new Date(this.fixedTime)
  }

  today(): string {
    return formatLocalDate(this.now())
  }
}
