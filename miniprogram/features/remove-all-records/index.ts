export type RemoveAllRecordsState = {
  visible: boolean
  removing: boolean
  removeError?: string
}

export const createRemoveAllRecordsState = (): RemoveAllRecordsState => ({
  visible: false,
  removing: false,
  removeError: '',
})
