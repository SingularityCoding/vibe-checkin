const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0')

export const formatLocalDate = (date: Date): string => {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot format an invalid date')
  }

  return `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`
}

export const parseLocalDate = (value: string): Date => {
  const match = LOCAL_DATE_PATTERN.exec(value)

  if (!match) {
    throw new Error(`Invalid local date: ${value}`)
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Invalid local date: ${value}`)
  }

  return date
}

export const isLocalDate = (value: string): boolean => {
  try {
    parseLocalDate(value)
    return true
  } catch {
    return false
  }
}

export const addLocalDays = (value: string, amount: number): string => {
  if (!Number.isInteger(amount)) {
    throw new Error(`Day amount must be an integer: ${amount}`)
  }

  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

export const compareLocalDates = (left: string, right: string): number => {
  parseLocalDate(left)
  parseLocalDate(right)

  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}
