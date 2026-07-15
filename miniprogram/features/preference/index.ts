import {
  RECORD_DURATION_MAX,
  RECORD_DURATION_MIN,
  RECORD_DURATION_STEP,
} from '../../domain/constraints'

export type PreferenceValidation = {
  isValid: boolean
  value: number
  error?: string
}

const DURATION_ERROR_MESSAGE = `默认学习时长需为 ${RECORD_DURATION_MIN}-${RECORD_DURATION_MAX} 分钟之间、以 ${RECORD_DURATION_STEP} 分钟为步长的整数`

export const validateDefaultDuration = (value: number): PreferenceValidation => {
  const isValid =
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= RECORD_DURATION_MIN &&
    value <= RECORD_DURATION_MAX &&
    value % RECORD_DURATION_STEP === 0

  if (!isValid) {
    return { isValid: false, value, error: DURATION_ERROR_MESSAGE }
  }

  return { isValid: true, value }
}
