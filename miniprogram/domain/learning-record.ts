export type LearningRecord = {
  id: string
  date: string
  createdAt: number
  updatedAt: number
  content: string
  duration: number
  tags: string[]
  takeaway?: string
}

export type RecordInput = {
  content: string
  duration: number
  tags: string[]
  takeaway?: string
}
