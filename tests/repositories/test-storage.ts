import type { KeyValueStorage } from '../../miniprogram/repositories/storage'

export class TestStorage implements KeyValueStorage {
  private readonly values = new Map<string, unknown>()

  get(key: string): unknown {
    return this.values.get(key)
  }

  set(key: string, value: unknown): void {
    this.values.set(key, value)
  }

  remove(key: string): void {
    this.values.delete(key)
  }
}
