// 页面级请求状态：跟踪 removeAllMine() 这次调用是否在途 / 是否刚失败。
// 与 Component 内部的二次确认状态机彼此独立：请求失败后重试不需要
// 用户重新走一遍确认，请求在途时也不允许再次发起确认。
export type RemoveAllRecordsRequestState = {
  removing: boolean
  removeError: string
}

export const createRemoveAllRecordsState = (): RemoveAllRecordsRequestState => ({
  removing: false,
  removeError: '',
})

// Component 级二次确认状态机：只跟踪用户是否已经点过一次确认。
export type RemoveAllConfirmStep = 'idle' | 'confirming'

export type RemoveAllConfirmState = {
  step: RemoveAllConfirmStep
}

export const createRemoveAllConfirmState = (): RemoveAllConfirmState => ({
  step: 'idle',
})

export const requestRemoveAllConfirmation = (
  _state: RemoveAllConfirmState,
): RemoveAllConfirmState => ({
  step: 'confirming',
})

export const cancelRemoveAllConfirmation = (
  _state: RemoveAllConfirmState,
): RemoveAllConfirmState => ({
  step: 'idle',
})

// 只有当状态机确实处于确认步骤时才算真实确认；一次意外或重复触发的
// 确认调用（step 仍是 idle）必须被拒绝，防止一次误触就清空全部数据。
export const confirmRemoveAll = (
  state: RemoveAllConfirmState,
): { state: RemoveAllConfirmState; confirmed: boolean } => {
  if (state.step !== 'confirming') {
    return { state, confirmed: false }
  }

  return { state: { step: 'idle' }, confirmed: true }
}
