export interface KeyValueStorage {
  get(key: string): unknown
  set(key: string, value: unknown): void
  remove(key: string): void
}

export class WxStorage implements KeyValueStorage {
  get(key: string): unknown {
    return wx.getStorageSync(key) as unknown
  }

  set(key: string, value: unknown): void {
    wx.setStorageSync(key, value)
  }

  remove(key: string): void {
    wx.removeStorageSync(key)
  }
}
