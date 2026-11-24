import { describe, expect, it, vi } from 'vitest'
import { getLocalStorage, readJson, writeJson } from './storage'

function brokenStorage(): Storage {
  const fail = () => {
    throw new DOMException('denied', 'SecurityError')
  }
  return { getItem: fail, setItem: fail, removeItem: fail, clear: fail, key: fail, length: 0 }
}

describe('getLocalStorage', () => {
  it('returns localStorage when it works', () => {
    expect(getLocalStorage()).toBe(localStorage)
  })

  it('returns null when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(getLocalStorage()).toBeNull()
  })
})

describe('readJson', () => {
  it('reads a stored JSON value', () => {
    localStorage.setItem('k', '{"a":1}')
    expect(readJson(localStorage, 'k')).toEqual({ a: 1 })
  })

  it('returns undefined when the key is missing', () => {
    expect(readJson(localStorage, 'missing')).toBeUndefined()
  })

  it('returns undefined for invalid JSON', () => {
    localStorage.setItem('k', '{not json')
    expect(readJson(localStorage, 'k')).toBeUndefined()
  })

  it('returns undefined without storage or when it throws', () => {
    expect(readJson(null, 'k')).toBeUndefined()
    expect(readJson(brokenStorage(), 'k')).toBeUndefined()
  })
})

describe('writeJson', () => {
  it('stores a JSON value', () => {
    expect(writeJson(localStorage, 'k', { a: 1 })).toBe(true)
    expect(localStorage.getItem('k')).toBe('{"a":1}')
  })

  it('returns false without storage or when it throws', () => {
    expect(writeJson(null, 'k', 1)).toBe(false)
    expect(writeJson(brokenStorage(), 'k', 1)).toBe(false)
  })
})
