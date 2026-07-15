import { describe, expect, it, vi } from 'vitest'

import {
  checkCloudConnection,
  initializeCloudBase,
  type CloudClientPort,
} from '../../miniprogram/cloud/connection'
import {
  CLOUD_COLLECTIONS,
  CLOUD_CURRENT_USER_QUERY,
  CLOUD_ENV_ID,
} from '../../miniprogram/config/cloud'

type CloudStubOptions = {
  initError?: unknown
  readError?: unknown
}

const createCloudStub = (options: CloudStubOptions = {}) => {
  const init = vi.fn(() => {
    if (options.initError) {
      throw options.initError
    }
  })
  const get = vi.fn(async () => {
    if (options.readError) {
      throw options.readError
    }

    return { data: [] }
  })
  const limit = vi.fn(() => ({ get, limit, where }))
  const where = vi.fn(() => ({ get, limit, where }))
  const collection = vi.fn(() => ({ get, limit, where }))
  const database = vi.fn(() => ({ collection }))
  const cloud: CloudClientPort = { init, database }

  return { cloud, collection, database, get, init, limit, where }
}

describe('CloudBase connection foundation', () => {
  it('initializes the configured environment exactly through the cloud port', () => {
    const stub = createCloudStub()

    expect(initializeCloudBase({ cloud: stub.cloud })).toMatchObject({ state: 'ready' })
    expect(stub.init).toHaveBeenCalledWith({
      env: CLOUD_ENV_ID,
      traceUser: true,
    })
  })

  it('keeps Local usable when cloud initialization is unavailable or fails', () => {
    expect(initializeCloudBase({ cloud: null })).toMatchObject({
      state: 'unavailable',
    })

    const stub = createCloudStub({ initError: { errCode: -1 } })
    expect(initializeCloudBase({ cloud: stub.cloud })).toMatchObject({
      state: 'failed',
      errorCode: '-1',
    })
  })

  it('checks only the current user with a one-document read', async () => {
    const stub = createCloudStub()

    await expect(
      checkCloudConnection({ cloud: stub.cloud, now: () => 123456 }),
    ).resolves.toMatchObject({
      ok: true,
      checkedAt: 123456,
      collection: CLOUD_COLLECTIONS.learningRecords,
    })
    expect(stub.database).toHaveBeenCalledWith({ env: CLOUD_ENV_ID })
    expect(stub.collection).toHaveBeenCalledWith(CLOUD_COLLECTIONS.learningRecords)
    expect(stub.where).toHaveBeenCalledWith({
      _openid: CLOUD_CURRENT_USER_QUERY,
    })
    expect(stub.limit).toHaveBeenCalledWith(1)
  })

  it('returns a safe diagnostic error without exposing database documents', async () => {
    const stub = createCloudStub({
      readError: {
        errCode: 'PERMISSION_DENIED',
        _openid: 'private-user-id',
        data: [{ content: 'private learning record' }],
      },
    })

    const result = await checkCloudConnection({ cloud: stub.cloud, now: () => 654321 })

    expect(result).toMatchObject({
      ok: false,
      checkedAt: 654321,
      errorCode: 'PERMISSION_DENIED',
    })
    expect(result).not.toHaveProperty('_openid')
    expect(result).not.toHaveProperty('data')
    expect(JSON.stringify(result)).not.toContain('private learning record')
  })
})
