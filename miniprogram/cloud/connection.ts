import {
  CLOUD_COLLECTIONS,
  CLOUD_CURRENT_USER_QUERY,
  CLOUD_ENV_ID,
} from '../config/cloud'

type CloudQueryPort = {
  where(condition: Record<string, unknown>): CloudQueryPort
  limit(max: number): CloudQueryPort
  get(): Promise<{ data: unknown[] }>
}

type CloudDatabasePort = {
  collection(name: string): CloudQueryPort
}

export type CloudClientPort = {
  init(config: { env: string; traceUser: boolean }): void
  database(config: { env: string }): CloudDatabasePort
}

export type CloudInitializationStatus =
  | {
      state: 'ready'
      message: string
    }
  | {
      state: 'unavailable' | 'failed'
      message: string
      errorCode?: string
    }

export type CloudConnectionCheckResult =
  | {
      ok: true
      checkedAt: number
      collection: string
      message: string
    }
  | {
      ok: false
      checkedAt: number
      collection: string
      message: string
      errorCode?: string
    }

export type CloudDiagnostics = {
  check(): Promise<CloudConnectionCheckResult>
}

type CloudOptions = {
  cloud?: CloudClientPort | null
  now?: () => number
}

const resolveCloudClient = (
  cloud: CloudClientPort | null | undefined,
): CloudClientPort | null => {
  if (cloud !== undefined) {
    return cloud
  }

  if (typeof wx === 'undefined' || typeof wx.cloud === 'undefined') {
    return null
  }

  return wx.cloud
}

const extractErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  const candidate = error as { errCode?: unknown; code?: unknown }
  const code = candidate.errCode ?? candidate.code

  if (typeof code === 'string' || typeof code === 'number') {
    return String(code)
  }

  return undefined
}

export const initializeCloudBase = (
  options: CloudOptions = {},
): CloudInitializationStatus => {
  const cloud = resolveCloudClient(options.cloud)

  if (!cloud) {
    return {
      state: 'unavailable',
      message: '当前基础库不支持微信云开发，应用将继续使用本地数据。',
    }
  }

  try {
    cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true,
    })

    return {
      state: 'ready',
      message: '微信云开发已初始化。',
    }
  } catch (error) {
    return {
      state: 'failed',
      message: '微信云开发初始化失败，应用将继续使用本地数据。',
      errorCode: extractErrorCode(error),
    }
  }
}

export const checkCloudConnection = async (
  options: CloudOptions = {},
): Promise<CloudConnectionCheckResult> => {
  const cloud = resolveCloudClient(options.cloud)
  const checkedAt = (options.now ?? Date.now)()
  const collection = CLOUD_COLLECTIONS.learningRecords

  if (!cloud) {
    return {
      ok: false,
      checkedAt,
      collection,
      message: '当前基础库不支持微信云开发。',
    }
  }

  try {
    await cloud
      .database({ env: CLOUD_ENV_ID })
      .collection(collection)
      .where({ _openid: CLOUD_CURRENT_USER_QUERY })
      .limit(1)
      .get()

    return {
      ok: true,
      checkedAt,
      collection,
      message: 'CloudBase collection 与当前用户权限可正常访问。',
    }
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      collection,
      message: 'CloudBase 连接检查失败，请核对 collection 和安全规则。',
      errorCode: extractErrorCode(error),
    }
  }
}

export const createCloudDiagnostics = (): CloudDiagnostics => ({
  check: () => checkCloudConnection(),
})
