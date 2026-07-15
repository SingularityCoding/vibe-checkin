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

export const validateDefaultDuration = (value: number): PreferenceValidation => {
  const isValid =
    Number.isInteger(value) &&
    value >= RECORD_DURATION_MIN &&
    value <= RECORD_DURATION_MAX &&
    value % RECORD_DURATION_STEP === 0

  if (isValid) {
    return { isValid: true, value }
  }

  return {
    isValid: false,
    value,
    error: `默认学习时长需为 ${RECORD_DURATION_MIN}–${RECORD_DURATION_MAX} 分钟，并以 ${RECORD_DURATION_STEP} 分钟为步长。`,
  }
}
