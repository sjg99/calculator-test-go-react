/**
 * Returns window.localStorage if it can be used, or null when it is
 * unavailable (disabled, private mode with no quota, or no window).
 */
export function getLocalStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage
    const probe = '__storage_probe__'
    storage.setItem(probe, probe)
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

/** Reads and parses a JSON value. Returns undefined when missing or unreadable. */
export function readJson(storage: Storage | null, key: string): unknown {
  if (!storage) return undefined
  try {
    const raw = storage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as unknown)
  } catch {
    return undefined
  }
}

/** Serialises and stores a JSON value. Returns false if it could not be stored. */
export function writeJson(storage: Storage | null, key: string, value: unknown): boolean {
  if (!storage) return false
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
