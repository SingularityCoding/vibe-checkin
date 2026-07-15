export type PreferenceValidation = {
  isValid: boolean
  value: number
  error?: string
}

export const validateDefaultDuration = (value: number): PreferenceValidation => ({
  isValid: false,
  value,
})
