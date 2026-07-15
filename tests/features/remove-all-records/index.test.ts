import { describe, expect, it } from 'vitest'

import {
  cancelRemoveAllConfirmation,
  confirmRemoveAll,
  createRemoveAllConfirmState,
  createRemoveAllRecordsState,
  requestRemoveAllConfirmation,
} from '../../../miniprogram/features/remove-all-records/index'

describe('remove-all-records request state', () => {
  it('starts with no in-flight request and no error', () => {
    expect(createRemoveAllRecordsState()).toEqual({
      removing: false,
      removeError: '',
    })
  })
})

describe('remove-all-records confirm state machine', () => {
  it('AC-001: starts at the idle step', () => {
    expect(createRemoveAllConfirmState()).toEqual({ step: 'idle' })
  })

  it('AC-002: a first confirmation request moves idle to confirming', () => {
    const state = createRemoveAllConfirmState()

    expect(requestRemoveAllConfirmation(state)).toEqual({ step: 'confirming' })
  })

  it('AC-003: cancelling from the confirm panel returns to idle without confirming', () => {
    const confirming = requestRemoveAllConfirmation(createRemoveAllConfirmState())

    const cancelled = cancelRemoveAllConfirmation(confirming)

    expect(cancelled).toEqual({ step: 'idle' })
    // 取消后立刻收到的确认调用不能算作真实确认
    expect(confirmRemoveAll(cancelled).confirmed).toBe(false)
  })

  it('AC-004: confirming from the confirming step reports confirmed and resets to idle', () => {
    const confirming = requestRemoveAllConfirmation(createRemoveAllConfirmState())

    expect(confirmRemoveAll(confirming)).toEqual({
      state: { step: 'idle' },
      confirmed: true,
    })
  })

  it('AC-005: a stray confirm call while idle is rejected and leaves state untouched', () => {
    const idle = createRemoveAllConfirmState()

    const result = confirmRemoveAll(idle)

    expect(result.confirmed).toBe(false)
    expect(result.state).toBe(idle) // 状态原样不变，防止一次误触清空数据
  })

  it('AC-006: confirm → cancel → confirm again still allows a real confirmation', () => {
    let state = createRemoveAllConfirmState()
    state = requestRemoveAllConfirmation(state) // idle -> confirming
    state = cancelRemoveAllConfirmation(state) // confirming -> idle
    state = requestRemoveAllConfirmation(state) // idle -> confirming

    expect(confirmRemoveAll(state)).toEqual({
      state: { step: 'idle' },
      confirmed: true,
    })
  })
})
